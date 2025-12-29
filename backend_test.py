import requests
import sys
import json
from datetime import datetime

class LawnBowlsAPITester:
    def __init__(self, base_url="https://bowlscore.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tournament_id = None
        self.team_ids = []
        self.round_id = None
        self.match_ids = []
        # Championship testing variables
        self.championship_id = None
        self.championship_access_token = None
        self.championship_match_ids = []
        self.section_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_user_login_championship(self):
        """Test user login with championship test credentials"""
        login_data = {
            "email": "test_champ@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Championship User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        else:
            # If login fails, register the user
            register_data = {
                "email": "test_champ@example.com",
                "password": "testpass123",
                "name": "Championship Test User"
            }
            
            success, response = self.run_test(
                "Championship User Registration",
                "POST",
                "auth/register",
                200,
                data=register_data
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                self.user_id = response['user']['id']
                return True
        return False

    def test_create_tournament_4_teams(self):
        """Test creating tournament with 4 teams"""
        tournament_data = {
            "name": "Test Tournament 4 Teams",
            "teams": ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"]
        }
        
        success, response = self.run_test(
            "Create Tournament (4 teams)",
            "POST",
            "tournaments",
            200,
            data=tournament_data
        )
        
        if success and 'id' in response:
            self.tournament_id = response['id']
            print(f"   Tournament ID: {self.tournament_id}")
            return True
        return False

    def test_create_tournament_6_teams(self):
        """Test creating tournament with 6 teams"""
        tournament_data = {
            "name": "Test Tournament 6 Teams",
            "teams": ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6"]
        }
        
        success, response = self.run_test(
            "Create Tournament (6 teams)",
            "POST",
            "tournaments",
            200,
            data=tournament_data
        )
        
        if success and 'id' in response:
            # Store this for later use
            return True
        return False

    def test_create_tournament_8_teams(self):
        """Test creating tournament with 8 teams"""
        tournament_data = {
            "name": "Test Tournament 8 Teams", 
            "teams": ["Team A", "Team B", "Team C", "Team D", "Team E", "Team F", "Team G", "Team H"]
        }
        
        success, response = self.run_test(
            "Create Tournament (8 teams)",
            "POST",
            "tournaments",
            200,
            data=tournament_data
        )
        
        if success and 'id' in response:
            return True
        return False

    def test_get_tournaments(self):
        """Test getting user's tournaments"""
        success, response = self.run_test(
            "Get Tournaments",
            "GET",
            "tournaments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} tournaments")
            return True
        return False

    def test_get_tournament_details(self):
        """Test getting tournament details"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Get Tournament Details",
            "GET",
            f"tournaments/{self.tournament_id}",
            200
        )
        
        if success and 'id' in response:
            print(f"   Tournament: {response.get('name')}")
            print(f"   Status: {response.get('status')}")
            print(f"   Current Round: {response.get('current_round')}")
            return True
        return False

    def test_get_teams(self):
        """Test getting tournament teams"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Get Tournament Teams",
            "GET",
            f"tournaments/{self.tournament_id}/teams",
            200
        )
        
        if success and isinstance(response, list):
            self.team_ids = [team['id'] for team in response]
            print(f"   Found {len(response)} teams")
            for team in response:
                print(f"     - {team['name']}: {team['total_points']} points")
            return True
        return False

    def test_start_tournament(self):
        """Test starting tournament"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Start Tournament",
            "POST",
            f"tournaments/{self.tournament_id}/start",
            200
        )
        
        if success and 'round_id' in response:
            self.round_id = response['round_id']
            print(f"   Round ID: {self.round_id}")
            return True
        return False

    def test_get_rounds(self):
        """Test getting tournament rounds"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Get Tournament Rounds",
            "GET",
            f"tournaments/{self.tournament_id}/rounds",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} rounds")
            return True
        return False

    def test_get_matches(self):
        """Test getting round matches"""
        if not self.round_id:
            print("❌ No round ID available")
            return False
            
        success, response = self.run_test(
            "Get Round Matches",
            "GET",
            f"rounds/{self.round_id}/matches",
            200
        )
        
        if success and isinstance(response, list):
            self.match_ids = [match['id'] for match in response]
            print(f"   Found {len(response)} matches")
            for match in response:
                print(f"     - {match['team1_name']} vs {match['team2_name']} (Green {match['green']}, Rink {match['rink']})")
            return True
        return False

    def test_get_match_details(self):
        """Test getting match details"""
        if not self.match_ids:
            print("❌ No match IDs available")
            return False
            
        match_id = self.match_ids[0]
        success, response = self.run_test(
            "Get Match Details",
            "GET",
            f"matches/{match_id}",
            200
        )
        
        if success and 'id' in response:
            print(f"   Match: {response.get('team1_name')} vs {response.get('team2_name')}")
            print(f"   Status: {response.get('status')}")
            return True
        return False

    def test_scoring_system(self):
        """Test the complex scoring system"""
        if not self.match_ids:
            print("❌ No match IDs available")
            return False
            
        match_id = self.match_ids[0]
        
        # Test Skin 1 scoring
        skin1_data = {
            "skin_number": 1,
            "team1_shots": 8,
            "team2_shots": 5
        }
        
        success1, _ = self.run_test(
            "Enter Skin 1 Scores",
            "PUT",
            f"matches/{match_id}/scores",
            200,
            data=skin1_data
        )
        
        # Test Skin 2 scoring
        skin2_data = {
            "skin_number": 2,
            "team1_shots": 4,
            "team2_shots": 7
        }
        
        success2, _ = self.run_test(
            "Enter Skin 2 Scores",
            "PUT",
            f"matches/{match_id}/scores",
            200,
            data=skin2_data
        )
        
        # Test Skin 3 scoring (this should complete the match)
        skin3_data = {
            "skin_number": 3,
            "team1_shots": 6,
            "team2_shots": 6
        }
        
        success3, _ = self.run_test(
            "Enter Skin 3 Scores",
            "PUT",
            f"matches/{match_id}/scores",
            200,
            data=skin3_data
        )
        
        if success1 and success2 and success3:
            # Verify the match is completed and points calculated correctly
            success, response = self.run_test(
                "Verify Match Completion",
                "GET",
                f"matches/{match_id}",
                200
            )
            
            if success and response.get('status') == 'completed':
                print(f"   Team 1 Skin Points: {response.get('team1_skin_points')}")
                print(f"   Team 2 Skin Points: {response.get('team2_skin_points')}")
                print(f"   Team 1 Match Points: {response.get('team1_match_points')}")
                print(f"   Team 2 Match Points: {response.get('team2_match_points')}")
                
                # Verify scoring logic
                # Skin 1: Team 1 wins (8 > 5) = 1 point
                # Skin 2: Team 2 wins (7 > 4) = 1 point  
                # Skin 3: Draw (6 = 6) = 0.5 each
                # Total skin points: Team 1 = 1.5, Team 2 = 1.5
                # Since tied on skin points, bonus goes to team with more total shots
                # Team 1 total: 8+4+6 = 18, Team 2 total: 5+7+6 = 18 (tied)
                # Perfect tie should split bonus: Team 1 = 2.5, Team 2 = 2.5
                
                expected_team1_skin = 1.5
                expected_team2_skin = 1.5
                expected_team1_match = 2.5
                expected_team2_match = 2.5
                
                actual_team1_skin = response.get('team1_skin_points')
                actual_team2_skin = response.get('team2_skin_points')
                actual_team1_match = response.get('team1_match_points')
                actual_team2_match = response.get('team2_match_points')
                
                if (abs(actual_team1_skin - expected_team1_skin) < 0.01 and
                    abs(actual_team2_skin - expected_team2_skin) < 0.01 and
                    abs(actual_team1_match - expected_team1_match) < 0.01 and
                    abs(actual_team2_match - expected_team2_match) < 0.01):
                    print("   ✅ Scoring algorithm working correctly!")
                    return True
                else:
                    print(f"   ❌ Scoring mismatch - Expected: T1={expected_team1_match}, T2={expected_team2_match}")
                    print(f"                        Actual: T1={actual_team1_match}, T2={actual_team2_match}")
                    return False
            return False
        return False

    def test_leaderboard(self):
        """Test leaderboard functionality"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            f"tournaments/{self.tournament_id}/leaderboard",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Leaderboard has {len(response)} teams")
            for i, team in enumerate(response):
                print(f"     {i+1}. {team['name']}: {team['total_points']} points")
            return True
        return False

    def test_complete_all_matches_and_next_round(self):
        """Test completing all matches and generating next round"""
        if not self.match_ids:
            print("❌ No match IDs available")
            return False
            
        # Complete remaining matches
        for i, match_id in enumerate(self.match_ids[1:], 1):  # Skip first match (already completed)
            print(f"\n   Completing match {i+1}...")
            
            # Enter scores for all 3 skins
            for skin in range(1, 4):
                skin_data = {
                    "skin_number": skin,
                    "team1_shots": 5 + i,  # Vary scores
                    "team2_shots": 4 + i
                }
                
                success, _ = self.run_test(
                    f"Match {i+1} Skin {skin}",
                    "PUT",
                    f"matches/{match_id}/scores",
                    200,
                    data=skin_data
                )
                
                if not success:
                    return False
        
        # Try to generate next round
        success, response = self.run_test(
            "Generate Round 2",
            "POST",
            f"tournaments/{self.tournament_id}/rounds/next",
            200
        )
        
        if success and 'round_id' in response:
            print(f"   Round 2 ID: {response['round_id']}")
            
            # Get Round 2 matches to verify draw algorithm
            round2_id = response['round_id']
            success2, matches_response = self.run_test(
                "Get Round 2 Matches",
                "GET",
                f"rounds/{round2_id}/matches",
                200
            )
            
            if success2 and isinstance(matches_response, list):
                print(f"   Round 2 has {len(matches_response)} matches")
                for match in matches_response:
                    print(f"     - {match['team1_name']} vs {match['team2_name']} (Green {match['green']}, Rink {match['rink']})")
                return True
        return False

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n🔍 Testing Edge Cases...")
        
        # Test invalid tournament ID
        success, _ = self.run_test(
            "Invalid Tournament ID",
            "GET",
            "tournaments/invalid-id",
            404
        )
        
        # Test invalid match ID
        success2, _ = self.run_test(
            "Invalid Match ID",
            "GET",
            "matches/invalid-id",
            404
        )
        
        # Test negative scores
        if self.match_ids:
            invalid_scores = {
                "skin_number": 1,
                "team1_shots": -5,
                "team2_shots": 10
            }
            
            # This should either be rejected or handled gracefully
            success3, _ = self.run_test(
                "Negative Scores",
                "PUT",
                f"matches/{self.match_ids[0]}/scores",
                400  # Expecting validation error
            )
        
        return success and success2

    # ==================== CHAMPIONSHIP TESTS ====================
    
    def test_create_round_robin_championship(self):
        """Test creating a round robin championship"""
        championship_data = {
            "name": "Test Men's Singles Championship",
            "competition_type": "singles",
            "gender_category": "mens",
            "age_category": "open",
            "start_type": "round_robin",
            "ends_per_match": 15,
            "finals_ends": 21
        }
        
        success, response = self.run_test(
            "Create Round Robin Championship",
            "POST",
            "championships",
            200,
            data=championship_data
        )
        
        if success and 'championship' in response:
            self.championship_id = response['championship']['id']
            print(f"   Championship ID: {self.championship_id}")
            print(f"   Status: {response['championship']['status']}")
            return response['championship']['status'] == 'setup'
        return False

    def test_create_knockout_championship(self):
        """Test creating a knockout-only championship"""
        championship_data = {
            "name": "Test Knockout Championship",
            "competition_type": "pairs",
            "gender_category": "mixed",
            "age_category": "open",
            "start_type": "knockout",
            "ends_per_match": 18,
            "finals_ends": 21
        }
        
        success, response = self.run_test(
            "Create Knockout Championship",
            "POST",
            "championships",
            200,
            data=championship_data
        )
        
        if success and 'championship' in response:
            print(f"   Knockout Championship ID: {response['championship']['id']}")
            return response['championship']['status'] == 'setup'
        return False

    def test_get_championships(self):
        """Test getting user's championships"""
        success, response = self.run_test(
            "Get Championships",
            "GET",
            "championships",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} championships")
            return True
        return False

    def test_upload_participants_csv(self):
        """Test uploading participants via CSV"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
        
        # Create CSV content
        csv_content = """Section,Name
A,Player 1
A,Player 2
A,Player 3
B,Player 4
B,Player 5
B,Player 6"""
        
        # Use requests to upload file
        url = f"{self.api_url}/championships/{self.championship_id}/upload-participants"
        headers = {'Authorization': f'Bearer {self.token}'}
        files = {'file': ('participants.csv', csv_content, 'text/csv')}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Upload Participants CSV...")
        
        try:
            response = requests.post(url, headers=headers, files=files)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                data = response.json()
                print(f"   Uploaded {data.get('participant_count', 0)} participants")
                print(f"   Created {len(data.get('sections', []))} sections")
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_get_championship_sections(self):
        """Test getting championship sections"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Get Championship Sections",
            "GET",
            f"championships/{self.championship_id}/sections",
            200
        )
        
        if success and isinstance(response, list):
            self.section_ids = [section['id'] for section in response]
            print(f"   Found {len(response)} sections")
            for section in response:
                print(f"     - Section {section['name']}: {section['status']}")
            return True
        return False

    def test_get_championship_participants(self):
        """Test getting championship participants"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Get Championship Participants",
            "GET",
            f"championships/{self.championship_id}/participants",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} participants")
            for participant in response:
                print(f"     - {participant['name']}: {participant['points']} points")
            return True
        return False

    def test_generate_round_robin_matches(self):
        """Test generating round robin matches"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Generate Round Robin Matches",
            "POST",
            f"championships/{self.championship_id}/generate-round-robin",
            200
        )
        
        if success and 'access_token' in response:
            self.championship_access_token = response['access_token']
            print(f"   Generated {response.get('total_matches', 0)} matches")
            print(f"   Access token: {self.championship_access_token[:20]}...")
            return True
        return False

    def test_get_championship_matches(self):
        """Test getting championship matches"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Get Championship Matches",
            "GET",
            f"championships/{self.championship_id}/matches",
            200
        )
        
        if success and isinstance(response, list):
            self.championship_match_ids = [match['id'] for match in response]
            print(f"   Found {len(response)} matches")
            for match in response:
                print(f"     - {match['participant1_name']} vs {match['participant2_name']} (Green {match.get('green')}, Rink {match.get('rink')})")
            return True
        return False

    def test_get_championship_round_by_token(self):
        """Test getting championship round by access token (player view)"""
        if not self.championship_access_token:
            print("❌ No championship access token available")
            return False
            
        success, response = self.run_test(
            "Get Championship Round by Token",
            "GET",
            f"championship-round/{self.championship_access_token}",
            200
        )
        
        if success and 'championship' in response and 'matches' in response:
            print(f"   Championship: {response['championship']['name']}")
            print(f"   Matches available: {len(response['matches'])}")
            return True
        return False

    def test_submit_championship_match_scores(self):
        """Test submitting championship match scores"""
        if not self.championship_access_token or not self.championship_match_ids:
            print("❌ No championship access token or match IDs available")
            return False
            
        match_id = self.championship_match_ids[0]
        score_data = {
            "participant1_shots": 15,
            "participant2_shots": 12
        }
        
        success, response = self.run_test(
            "Submit Championship Match Scores",
            "POST",
            f"championship-round/{self.championship_access_token}/match/{match_id}/scores",
            200,
            data=score_data
        )
        
        if success:
            print(f"   Scores submitted: P1={score_data['participant1_shots']}, P2={score_data['participant2_shots']}")
            return True
        return False

    def test_verify_championship_match(self):
        """Test verifying championship match"""
        if not self.championship_id or not self.championship_match_ids:
            print("❌ No championship ID or match IDs available")
            return False
            
        match_id = self.championship_match_ids[0]
        verification_data = {
            "participant1_shots": 15,
            "participant2_shots": 12
        }
        
        success, response = self.run_test(
            "Verify Championship Match",
            "POST",
            f"championships/{self.championship_id}/matches/{match_id}/verify",
            200,
            data=verification_data
        )
        
        if success and 'winner_id' in response:
            print(f"   Match verified, winner: {response['winner_id']}")
            print(f"   Is draw: {response.get('is_draw', False)}")
            return True
        return False

    def test_complete_all_round_robin_matches(self):
        """Test completing all round robin matches"""
        if not self.championship_id or not self.championship_match_ids:
            print("❌ No championship ID or match IDs available")
            return False
        
        print(f"\n   Completing {len(self.championship_match_ids)} round robin matches...")
        
        for i, match_id in enumerate(self.championship_match_ids):
            # Vary scores to create realistic results
            p1_shots = 15 + (i % 3)
            p2_shots = 12 + (i % 4)
            
            verification_data = {
                "participant1_shots": p1_shots,
                "participant2_shots": p2_shots
            }
            
            success, response = self.run_test(
                f"Verify Match {i+1}",
                "POST",
                f"championships/{self.championship_id}/matches/{match_id}/verify",
                200,
                data=verification_data
            )
            
            if not success:
                print(f"   ❌ Failed to verify match {i+1}")
                return False
        
        print(f"   ✅ All {len(self.championship_match_ids)} matches completed")
        return True

    def test_get_section_standings(self):
        """Test getting section standings"""
        if not self.championship_id or not self.section_ids:
            print("❌ No championship ID or section IDs available")
            return False
            
        section_id = self.section_ids[0]
        success, response = self.run_test(
            "Get Section Standings",
            "GET",
            f"championships/{self.championship_id}/sections/{section_id}/standings",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Section standings ({len(response)} participants):")
            for i, participant in enumerate(response):
                print(f"     {i+1}. {participant['name']}: {participant['points']} pts, +{participant['shot_difference']}")
            return True
        return False

    def test_generate_knockout_bracket(self):
        """Test generating knockout bracket from round robin winners"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Generate Knockout Bracket",
            "POST",
            f"championships/{self.championship_id}/generate-knockout",
            200
        )
        
        if success and 'knockout_participants' in response:
            print(f"   Knockout bracket created with {response.get('knockout_participants', 0)} participants")
            print(f"   Matches created: {response.get('matches_created', 0)}")
            return True
        return False

    def test_get_public_championship_standings(self):
        """Test getting public championship standings"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Get Public Championship Standings",
            "GET",
            f"public/championships/{self.championship_id}/standings",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Public standings ({len(response)} participants)")
            return True
        return False

    def test_get_public_championship_bracket(self):
        """Test getting public championship bracket"""
        if not self.championship_id:
            print("❌ No championship ID available")
            return False
            
        success, response = self.run_test(
            "Get Public Championship Bracket",
            "GET",
            f"public/championships/{self.championship_id}/bracket",
            200
        )
        
        if success:
            print(f"   Public bracket retrieved")
            return True
        return False

    def test_championship_flow_complete(self):
        """Test complete championship flow"""
        print("\n🏆 Testing Complete Championship Flow...")
        
        # Step 1: Create championship
        if not self.test_create_round_robin_championship():
            return False
        
        # Step 2: Upload participants
        if not self.test_upload_participants_csv():
            return False
        
        # Step 3: Get sections and participants
        if not self.test_get_championship_sections():
            return False
        if not self.test_get_championship_participants():
            return False
        
        # Step 4: Generate round robin matches
        if not self.test_generate_round_robin_matches():
            return False
        
        # Step 5: Get matches
        if not self.test_get_championship_matches():
            return False
        
        # Step 6: Test player access via token
        if not self.test_get_championship_round_by_token():
            return False
        
        # Step 7: Submit and verify scores
        if not self.test_submit_championship_match_scores():
            return False
        if not self.test_verify_championship_match():
            return False
        
        # Step 8: Complete all matches
        if not self.test_complete_all_round_robin_matches():
            return False
        
        # Step 9: Check standings
        if not self.test_get_section_standings():
            return False
        
        # Step 10: Generate knockout bracket
        if not self.test_generate_knockout_bracket():
            return False
        
        # Step 11: Test public endpoints
        if not self.test_get_public_championship_standings():
            return False
        if not self.test_get_public_championship_bracket():
            return False
        
        print("🎉 Complete championship flow test passed!")
        return True

def main():
    print("🏆 Starting Lawn Bowls Tournament API Tests")
    print("=" * 50)
    
    tester = LawnBowlsAPITester()
    
    # Authentication Tests
    if not tester.test_user_registration():
        print("❌ Registration failed, stopping tests")
        return 1
    
    # Tournament Management Tests
    if not tester.test_create_tournament_4_teams():
        print("❌ Tournament creation failed, stopping tests")
        return 1
    
    # Test different team counts
    tester.test_create_tournament_6_teams()
    tester.test_create_tournament_8_teams()
    
    # Tournament Operations
    tester.test_get_tournaments()
    tester.test_get_tournament_details()
    tester.test_get_teams()
    
    # Start tournament and test draw generation
    if not tester.test_start_tournament():
        print("❌ Tournament start failed, stopping tests")
        return 1
    
    tester.test_get_rounds()
    tester.test_get_matches()
    tester.test_get_match_details()
    
    # Test complex scoring system
    if not tester.test_scoring_system():
        print("❌ Scoring system test failed")
        return 1
    
    tester.test_leaderboard()
    
    # Test round progression
    tester.test_complete_all_matches_and_next_round()
    
    # Test edge cases
    tester.test_edge_cases()
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())