import requests
import sys
import json
from datetime import datetime

class StandardScoringAPITester:
    def __init__(self, base_url="https://matchtrack-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tournament_id = None
        self.round_id = None
        self.round_token = None
        self.match_ids = []

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

    def test_login_existing_user(self):
        """Test login with existing organizer user"""
        login_data = {
            "email": "organizer@example.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Login Existing Organizer",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
            print(f"   User Name: {response['user']['name']}")
            return True
        return False

    def test_create_standard_tournament(self):
        """Test creating tournament with Standard scoring"""
        tournament_data = {
            "name": "Standard Scoring Test Tournament",
            "teams": ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"],
            "umpire_email": "organizer@example.com",
            "scoring_type": "standard",
            "player_format": "pairs",
            "num_ends": 18,
            "draw_type_round2": "strength"
        }
        
        success, response = self.run_test(
            "Create Standard Tournament",
            "POST",
            "tournaments",
            200,
            data=tournament_data
        )
        
        if success and 'tournament' in response:
            self.tournament_id = response['tournament']['id']
            print(f"   Tournament ID: {self.tournament_id}")
            print(f"   Scoring Type: {response['tournament']['scoring_type']}")
            print(f"   Player Format: {response['tournament']['player_format']}")
            print(f"   Num Ends: {response['tournament']['num_ends']}")
            return True
        return False

    def test_create_singles_standard_tournament(self):
        """Test creating singles tournament with Standard scoring"""
        tournament_data = {
            "name": "Singles Standard Test Tournament",
            "teams": ["Player A", "Player B"],
            "umpire_email": "organizer@example.com",
            "scoring_type": "standard",
            "player_format": "singles",
            "num_ends": 21,
            "draw_type_round2": "random"
        }
        
        success, response = self.run_test(
            "Create Singles Standard Tournament",
            "POST",
            "tournaments",
            200,
            data=tournament_data
        )
        
        if success and 'tournament' in response:
            print(f"   Singles Tournament ID: {response['tournament']['id']}")
            print(f"   Player Format: {response['tournament']['player_format']}")
            return True
        return False

    def test_get_umpire_tournaments(self):
        """Test getting tournaments for umpire/organizer"""
        success, response = self.run_test(
            "Get Umpire Tournaments",
            "GET",
            "umpire/tournaments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} tournaments")
            for tournament in response:
                print(f"     - {tournament['name']} ({tournament['scoring_type']})")
            return True
        return False

    def test_generate_round(self):
        """Test generating Round 1 for standard tournament"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Generate Round 1",
            "POST",
            f"umpire/tournaments/{self.tournament_id}/rounds/generate",
            200
        )
        
        if success and 'round_id' in response:
            self.round_id = response['round_id']
            print(f"   Round ID: {self.round_id}")
            return True
        return False

    def test_get_round_matches(self):
        """Test getting matches for the round"""
        if not self.round_id:
            print("❌ No round ID available")
            return False
            
        success, response = self.run_test(
            "Get Round Matches",
            "GET",
            f"umpire/rounds/{self.round_id}/matches",
            200
        )
        
        if success and isinstance(response, list):
            self.match_ids = [match['id'] for match in response]
            print(f"   Found {len(response)} matches")
            for match in response:
                print(f"     - {match['team1_name']} vs {match['team2_name']} (Green {match['green']}, Rink {match['rink']})")
            return True
        return False

    def test_get_round_by_token(self):
        """Test getting round data by access token"""
        # First get the round to find the access token
        success, response = self.run_test(
            "Get Tournament Rounds",
            "GET",
            f"tournaments/{self.tournament_id}/rounds",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.round_token = response[0]['access_token']
            print(f"   Round Token: {self.round_token[:20]}...")
            
            # Now test the public endpoint
            success2, response2 = self.run_test(
                "Get Round by Token (Public)",
                "GET",
                f"rounds/by-token/{self.round_token}",
                200
            )
            
            if success2 and 'round' in response2 and 'matches' in response2 and 'tournament' in response2:
                print(f"   Round Number: {response2['round']['round_number']}")
                print(f"   Tournament Scoring: {response2['tournament']['scoring_type']}")
                print(f"   Matches Count: {len(response2['matches'])}")
                return True
        return False

    def test_submit_standard_scores(self):
        """Test submitting standard scores via public endpoint"""
        if not self.round_token or not self.match_ids:
            print("❌ No round token or match IDs available")
            return False
            
        match_id = self.match_ids[0]
        score_data = {
            "team1_shots": 15,
            "team2_shots": 12
        }
        
        success, response = self.run_test(
            "Submit Standard Scores",
            "POST",
            f"rounds/by-token/{self.round_token}/matches/{match_id}/standard-scores",
            200,
            data=score_data
        )
        
        if success:
            print(f"   Submitted: Team 1: {score_data['team1_shots']}, Team 2: {score_data['team2_shots']}")
            return True
        return False

    def test_verify_standard_match(self):
        """Test umpire verification of standard match"""
        if not self.match_ids:
            print("❌ No match IDs available")
            return False
            
        match_id = self.match_ids[0]
        verify_data = {
            "team1_shots": 15,
            "team2_shots": 12
        }
        
        success, response = self.run_test(
            "Verify Standard Match",
            "POST",
            f"umpire/matches/{match_id}/verify-standard",
            200,
            data=verify_data
        )
        
        if success:
            print(f"   Verified: Team 1: {verify_data['team1_shots']}, Team 2: {verify_data['team2_shots']}")
            print(f"   Expected Match Points: Team 1: 2, Team 2: 0 (Win=2, Loss=0)")
            return True
        return False

    def test_verify_draw_match(self):
        """Test verifying a draw match"""
        if len(self.match_ids) < 2:
            print("❌ Need at least 2 matches")
            return False
            
        match_id = self.match_ids[1]
        
        # First submit scores for a draw
        score_data = {
            "team1_shots": 18,
            "team2_shots": 18
        }
        
        success1, _ = self.run_test(
            "Submit Draw Scores",
            "POST",
            f"rounds/by-token/{self.round_token}/matches/{match_id}/standard-scores",
            200,
            data=score_data
        )
        
        if success1:
            # Now verify the draw
            success2, response = self.run_test(
                "Verify Draw Match",
                "POST",
                f"umpire/matches/{match_id}/verify-standard",
                200,
                data=score_data
            )
            
            if success2:
                print(f"   Verified Draw: Both teams {score_data['team1_shots']} shots")
                print(f"   Expected Match Points: Team 1: 1, Team 2: 1 (Draw=1 each)")
                return True
        return False

    def test_singles_max_validation(self):
        """Test singles max 21 shots validation"""
        # Create a singles tournament first
        singles_tournament_data = {
            "name": "Singles Validation Test",
            "teams": ["Player X", "Player Y"],
            "umpire_email": "organizer@example.com",
            "scoring_type": "standard",
            "player_format": "singles",
            "num_ends": 21,
            "draw_type_round2": "random"
        }
        
        success1, response1 = self.run_test(
            "Create Singles Tournament for Validation",
            "POST",
            "tournaments",
            200,
            data=singles_tournament_data
        )
        
        if success1 and 'tournament' in response1:
            singles_tournament_id = response1['tournament']['id']
            
            # Generate round
            success2, response2 = self.run_test(
                "Generate Singles Round",
                "POST",
                f"umpire/tournaments/{singles_tournament_id}/rounds/generate",
                200
            )
            
            if success2 and 'round_id' in response2:
                singles_round_id = response2['round_id']
                
                # Get matches
                success3, response3 = self.run_test(
                    "Get Singles Matches",
                    "GET",
                    f"umpire/rounds/{singles_round_id}/matches",
                    200
                )
                
                if success3 and len(response3) > 0:
                    singles_match_id = response3[0]['id']
                    
                    # Try to verify with > 21 shots (should fail)
                    invalid_data = {
                        "team1_shots": 25,  # Over 21 limit
                        "team2_shots": 18
                    }
                    
                    success4, _ = self.run_test(
                        "Verify Invalid Singles Scores (>21)",
                        "POST",
                        f"umpire/matches/{singles_match_id}/verify-standard",
                        400,  # Should fail with validation error
                        data=invalid_data
                    )
                    
                    return success4
        return False

    def test_get_standings(self):
        """Test getting tournament standings with match points"""
        if not self.tournament_id:
            print("❌ No tournament ID available")
            return False
            
        success, response = self.run_test(
            "Get Tournament Teams/Standings",
            "GET",
            f"tournaments/{self.tournament_id}/teams",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Standings ({len(response)} teams):")
            for i, team in enumerate(response):
                print(f"     {i+1}. {team['name']}: {team['total_points']} match points, {team['shots_for']} shots for, {team['shot_difference']} diff")
            
            # Verify match points are integers (2, 1, 0) for standard scoring
            for team in response:
                if team['total_points'] not in [0.0, 1.0, 2.0, 3.0, 4.0]:  # Allow multiple matches
                    print(f"   ⚠️  Team {team['name']} has non-standard match points: {team['total_points']}")
            
            return True
        return False

def main():
    print("🏆 Starting Standard Scoring API Tests")
    print("=" * 50)
    
    tester = StandardScoringAPITester()
    
    # Authentication
    if not tester.test_login_existing_user():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Tournament Creation
    if not tester.test_create_standard_tournament():
        print("❌ Standard tournament creation failed, stopping tests")
        return 1
    
    # Test singles tournament creation
    tester.test_create_singles_standard_tournament()
    
    # Tournament Management
    tester.test_get_umpire_tournaments()
    
    # Round Generation
    if not tester.test_generate_round():
        print("❌ Round generation failed, stopping tests")
        return 1
    
    tester.test_get_round_matches()
    
    # Public Score Entry
    if not tester.test_get_round_by_token():
        print("❌ Round token access failed, stopping tests")
        return 1
    
    tester.test_submit_standard_scores()
    
    # Umpire Verification
    tester.test_verify_standard_match()
    tester.test_verify_draw_match()
    
    # Validation Tests
    tester.test_singles_max_validation()
    
    # Standings
    tester.test_get_standings()
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All standard scoring tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())