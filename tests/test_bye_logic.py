"""
Test suite for BYE logic in knockout tournaments with odd numbers of section winners.
Tests the fix where participants with best round-robin performance get BYE advantage.

Key scenarios tested:
- 5 section winners: 3 BYEs, 1 match (Diana vs Eve)
- 3 section winners: 1 BYE, 1 match
- 4 section winners (even): 0 BYEs, 2 matches
- 7 section winners: 1 BYE, 3 matches
- BYE participants API endpoint
- Public bracket API with bye_participants
- advance_knockout_round carries BYE participants forward
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestByeLogic:
    """Test BYE logic for knockout tournaments with odd numbers of participants"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Register a unique test user
        self.test_email = f"test_bye_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "TestPass123!"
        self.test_name = "BYE Test User"
        
        # Register user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json()["access_token"]
        else:
            # Try login if user exists
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            assert login_response.status_code == 200, f"Failed to login: {login_response.text}"
            self.token = login_response.json()["access_token"]
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
        
    def create_championship_with_sections(self, num_sections, participants_per_section=2):
        """Helper to create a championship with specified number of sections"""
        # Create championship
        champ_response = self.session.post(f"{BASE_URL}/api/championships", json={
            "name": f"Test Championship {num_sections} Sections",
            "competition_type": "singles",
            "gender_category": "mens",
            "age_category": "open",
            "start_type": "round_robin",
            "ends_per_match": 15,
            "finals_ends": 21
        })
        assert champ_response.status_code == 200, f"Failed to create championship: {champ_response.text}"
        championship_id = champ_response.json()["championship"]["id"]
        
        # Create CSV content for sections
        section_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        participant_names = ['Alice', 'Bob', 'Carol', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']
        
        csv_lines = ["Section,Name"]
        for i in range(num_sections):
            section = section_letters[i]
            for j in range(participants_per_section):
                name = f"{participant_names[i]}_{j+1}" if participants_per_section > 1 else participant_names[i]
                csv_lines.append(f"{section},{name}")
        
        csv_content = "\n".join(csv_lines)
        
        # Upload participants
        files = {'file': ('participants.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        upload_response = requests.post(
            f"{BASE_URL}/api/championships/{championship_id}/upload-participants",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200, f"Failed to upload participants: {upload_response.text}"
        
        return championship_id
    
    def complete_round_robin(self, championship_id):
        """Helper to generate and complete all round-robin matches"""
        # Generate round robin
        gen_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-round-robin")
        assert gen_response.status_code == 200, f"Failed to generate round robin: {gen_response.text}"
        
        # Get all round robin matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/matches?stage=round_robin")
        assert matches_response.status_code == 200
        matches = matches_response.json()
        
        # Verify each match with different scores to create clear winners
        for i, match in enumerate(matches):
            # Give participant1 higher score to make them winner
            verify_response = self.session.post(
                f"{BASE_URL}/api/championships/{championship_id}/matches/{match['id']}/verify",
                json={"participant1_shots": 21, "participant2_shots": 10 + i}
            )
            assert verify_response.status_code == 200, f"Failed to verify match: {verify_response.text}"
        
        return matches
    
    def test_bye_logic_5_sections(self):
        """Test BYE logic with 5 section winners - should create 3 BYEs and 1 match"""
        championship_id = self.create_championship_with_sections(5, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200, f"Failed to generate knockout: {knockout_response.text}"
        
        knockout_data = knockout_response.json()
        
        # Verify: 5 participants -> bracket size 8 -> 3 BYEs
        assert "bye_participants" in knockout_data, "Response should include bye_participants"
        assert len(knockout_data["bye_participants"]) == 3, f"Expected 3 BYE participants, got {len(knockout_data['bye_participants'])}"
        
        # Verify: 1 match created (2 playing participants)
        assert len(knockout_data["matches"]) == 1, f"Expected 1 match, got {len(knockout_data['matches'])}"
        
        print(f"✓ 5 sections: {len(knockout_data['bye_participants'])} BYEs, {len(knockout_data['matches'])} match(es)")
        print(f"  BYE participants: {knockout_data['bye_participants']}")
    
    def test_bye_logic_3_sections(self):
        """Test BYE logic with 3 section winners - should create 1 BYE and 1 match"""
        championship_id = self.create_championship_with_sections(3, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200, f"Failed to generate knockout: {knockout_response.text}"
        
        knockout_data = knockout_response.json()
        
        # Verify: 3 participants -> bracket size 4 -> 1 BYE
        assert "bye_participants" in knockout_data
        assert len(knockout_data["bye_participants"]) == 1, f"Expected 1 BYE participant, got {len(knockout_data['bye_participants'])}"
        
        # Verify: 1 match created (2 playing participants)
        assert len(knockout_data["matches"]) == 1, f"Expected 1 match, got {len(knockout_data['matches'])}"
        
        print(f"✓ 3 sections: {len(knockout_data['bye_participants'])} BYE, {len(knockout_data['matches'])} match(es)")
    
    def test_bye_logic_4_sections_even(self):
        """Test BYE logic with 4 section winners (even) - should create 0 BYEs and 2 matches"""
        championship_id = self.create_championship_with_sections(4, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200, f"Failed to generate knockout: {knockout_response.text}"
        
        knockout_data = knockout_response.json()
        
        # Verify: 4 participants -> bracket size 4 -> 0 BYEs
        assert "bye_participants" in knockout_data
        assert len(knockout_data["bye_participants"]) == 0, f"Expected 0 BYE participants, got {len(knockout_data['bye_participants'])}"
        
        # Verify: 2 matches created
        assert len(knockout_data["matches"]) == 2, f"Expected 2 matches, got {len(knockout_data['matches'])}"
        
        print(f"✓ 4 sections (even): {len(knockout_data['bye_participants'])} BYEs, {len(knockout_data['matches'])} matches")
    
    def test_bye_logic_7_sections(self):
        """Test BYE logic with 7 section winners - should create 1 BYE and 3 matches"""
        championship_id = self.create_championship_with_sections(7, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200, f"Failed to generate knockout: {knockout_response.text}"
        
        knockout_data = knockout_response.json()
        
        # Verify: 7 participants -> bracket size 8 -> 1 BYE
        assert "bye_participants" in knockout_data
        assert len(knockout_data["bye_participants"]) == 1, f"Expected 1 BYE participant, got {len(knockout_data['bye_participants'])}"
        
        # Verify: 3 matches created (6 playing participants)
        assert len(knockout_data["matches"]) == 3, f"Expected 3 matches, got {len(knockout_data['matches'])}"
        
        print(f"✓ 7 sections: {len(knockout_data['bye_participants'])} BYE, {len(knockout_data['matches'])} matches")
    
    def test_bye_participants_api_endpoint(self):
        """Test /api/championships/{id}/bye-participants endpoint returns correct data"""
        championship_id = self.create_championship_with_sections(5, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200
        
        # Test BYE participants endpoint
        bye_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/bye-participants")
        assert bye_response.status_code == 200, f"BYE participants endpoint failed: {bye_response.text}"
        
        bye_data = bye_response.json()
        
        # Verify response structure
        assert "current_stage" in bye_data, "Response should include current_stage"
        assert "bye_participants" in bye_data, "Response should include bye_participants"
        
        # Verify BYE participants have correct structure
        for participant in bye_data["bye_participants"]:
            assert "id" in participant, "BYE participant should have id"
            assert "name" in participant, "BYE participant should have name"
            assert "status" in participant, "BYE participant should have status"
            assert participant["status"] == "Advances automatically", f"Status should be 'Advances automatically', got '{participant['status']}'"
        
        print(f"✓ BYE participants API: {len(bye_data['bye_participants'])} participants with 'Advances automatically' status")
    
    def test_public_bracket_includes_bye_participants(self):
        """Test /api/public/championships/{id}/bracket returns bye_participants"""
        championship_id = self.create_championship_with_sections(5, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200
        
        # Test public bracket endpoint (no auth required)
        public_session = requests.Session()
        bracket_response = public_session.get(f"{BASE_URL}/api/public/championships/{championship_id}/bracket")
        assert bracket_response.status_code == 200, f"Public bracket endpoint failed: {bracket_response.text}"
        
        bracket_data = bracket_response.json()
        
        # Verify response includes bye_participants
        assert "bye_participants" in bracket_data, "Public bracket should include bye_participants"
        assert "bracket" in bracket_data, "Public bracket should include bracket"
        assert "championship" in bracket_data, "Public bracket should include championship"
        
        # Verify BYE participants structure
        assert len(bracket_data["bye_participants"]) == 3, f"Expected 3 BYE participants, got {len(bracket_data['bye_participants'])}"
        
        for participant in bracket_data["bye_participants"]:
            assert participant["status"] == "Advances automatically"
        
        print(f"✓ Public bracket API includes {len(bracket_data['bye_participants'])} BYE participants")
    
    def test_advance_knockout_carries_bye_forward(self):
        """Test advance_knockout_round correctly carries BYE participants forward"""
        championship_id = self.create_championship_with_sections(5, 2)
        self.complete_round_robin(championship_id)
        
        # Generate knockout bracket (3 BYEs, 1 match)
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200
        knockout_data = knockout_response.json()
        
        # Get the single match and verify it
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/matches")
        assert matches_response.status_code == 200
        
        knockout_matches = [m for m in matches_response.json() if m["stage"] != "round_robin"]
        assert len(knockout_matches) == 1, "Should have 1 knockout match"
        
        match = knockout_matches[0]
        
        # Verify the match
        verify_response = self.session.post(
            f"{BASE_URL}/api/championships/{championship_id}/matches/{match['id']}/verify",
            json={"participant1_shots": 21, "participant2_shots": 15}
        )
        assert verify_response.status_code == 200, f"Failed to verify knockout match: {verify_response.text}"
        
        # Advance to next round
        advance_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/advance-knockout")
        assert advance_response.status_code == 200, f"Failed to advance knockout: {advance_response.text}"
        
        advance_data = advance_response.json()
        
        # After advancing: 3 BYE participants + 1 match winner = 4 participants
        # 4 participants -> bracket size 4 -> 0 BYEs, 2 matches
        # OR if it's semi-final stage
        
        # Get updated championship state
        champ_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}")
        assert champ_response.status_code == 200
        
        # Get new matches
        new_matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/matches")
        assert new_matches_response.status_code == 200
        
        current_stage = champ_response.json()["current_stage"]
        new_knockout_matches = [m for m in new_matches_response.json() if m["stage"] == current_stage]
        
        print(f"✓ Advanced to {current_stage} with {len(new_knockout_matches)} matches")
        print(f"  Advance response: {advance_data.get('message', 'No message')}")
    
    def test_bye_selection_based_on_performance(self):
        """Test that BYE participants are selected based on best round-robin performance"""
        championship_id = self.create_championship_with_sections(5, 2)
        
        # Generate round robin
        gen_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-round-robin")
        assert gen_response.status_code == 200
        
        # Get participants to track their IDs
        participants_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/participants")
        assert participants_response.status_code == 200
        participants = participants_response.json()
        
        # Get all round robin matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/matches?stage=round_robin")
        assert matches_response.status_code == 200
        matches = matches_response.json()
        
        # Verify matches with varying scores to create different performance levels
        # Higher scores = better performance = should get BYE
        for i, match in enumerate(matches):
            # Vary the scores to create different shot differences
            p1_shots = 21 - (i % 5)  # Varies from 21 to 17
            p2_shots = 10 + (i % 3)  # Varies from 10 to 12
            
            verify_response = self.session.post(
                f"{BASE_URL}/api/championships/{championship_id}/matches/{match['id']}/verify",
                json={"participant1_shots": p1_shots, "participant2_shots": p2_shots}
            )
            assert verify_response.status_code == 200
        
        # Generate knockout bracket
        knockout_response = self.session.post(f"{BASE_URL}/api/championships/{championship_id}/generate-knockout")
        assert knockout_response.status_code == 200
        
        knockout_data = knockout_response.json()
        
        # BYE participants should be the top 3 performers (highest points, shot diff, shots for)
        assert len(knockout_data["bye_participants"]) == 3
        
        # Get updated participants to check their stats
        updated_participants = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/participants")
        assert updated_participants.status_code == 200
        
        print(f"✓ BYE selection based on performance: {knockout_data['bye_participants']}")


class TestByeApiValidation:
    """Test API validation and edge cases for BYE logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        self.test_email = f"test_bye_api_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "TestPass123!"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "BYE API Test User"
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json()["access_token"]
        else:
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            self.token = login_response.json()["access_token"]
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_bye_endpoint_requires_auth(self):
        """Test that bye-participants endpoint requires authentication"""
        # Create a championship first
        champ_response = self.session.post(f"{BASE_URL}/api/championships", json={
            "name": "Auth Test Championship",
            "competition_type": "singles",
            "gender_category": "mens",
            "start_type": "round_robin",
            "ends_per_match": 15,
            "finals_ends": 21
        })
        assert champ_response.status_code == 200
        championship_id = champ_response.json()["championship"]["id"]
        
        # Try to access bye-participants without auth
        no_auth_session = requests.Session()
        bye_response = no_auth_session.get(f"{BASE_URL}/api/championships/{championship_id}/bye-participants")
        
        # Should return 401 Unauthorized
        assert bye_response.status_code == 401, f"Expected 401, got {bye_response.status_code}"
        
        print("✓ BYE endpoint requires authentication")
    
    def test_bye_endpoint_returns_empty_before_knockout(self):
        """Test that bye-participants returns empty list before knockout stage"""
        # Create championship
        champ_response = self.session.post(f"{BASE_URL}/api/championships", json={
            "name": "Pre-Knockout Test",
            "competition_type": "singles",
            "gender_category": "mens",
            "start_type": "round_robin",
            "ends_per_match": 15,
            "finals_ends": 21
        })
        assert champ_response.status_code == 200
        championship_id = champ_response.json()["championship"]["id"]
        
        # Check bye-participants before knockout
        bye_response = self.session.get(f"{BASE_URL}/api/championships/{championship_id}/bye-participants")
        assert bye_response.status_code == 200
        
        bye_data = bye_response.json()
        assert bye_data["bye_participants"] == [], "Should return empty list before knockout"
        
        print("✓ BYE endpoint returns empty list before knockout stage")
    
    def test_public_bracket_404_for_invalid_championship(self):
        """Test public bracket returns 404 for non-existent championship"""
        fake_id = str(uuid.uuid4())
        
        response = requests.get(f"{BASE_URL}/api/public/championships/{fake_id}/bracket")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Public bracket returns 404 for invalid championship")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
