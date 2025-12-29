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

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Use the same credentials from registration
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
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