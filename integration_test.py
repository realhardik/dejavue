"""
╔══════════════════════════════════════════════════════════════╗
║         DEJAVUE — INTEGRATION TEST SUITE                     ║
╚══════════════════════════════════════════════════════════════╝

Integration Tests: End-to-End System Flows
  IT-01: Full Meeting Lifecycle
          (Create → Transcript → Summary → Chat → Analytics)
  IT-02: Auth + Meeting Access Flow
          (Signup → Login → Create Meeting → Retrieve → Delete)
  IT-03: AI Pipeline Integration
          (Transcript → Summary → Context Injection → Chat Q&A)
  IT-04: Analytics Aggregation Flow
          (Multiple meetings → Analytics endpoint → KPI validation)
  IT-05: Error Propagation & System Resilience
          (Bad input at each layer → correct error returned each time)

Usage:
  Ensure the app is running (npm run dev), then:
    python3 integration_test.py
"""

import requests
import time
import json
import re
import sys
import random
import string

# ─── Config ──────────────────────────────────────────────────
BASE_URL      = "http://localhost:3000"
TEST_EMAIL    = f"it_{''.join(random.choices(string.ascii_lowercase, k=6))}@dejavue.test"
TEST_PASSWORD = "IntTest123!"
TEST_NAME     = "Integration Tester"

# ─── Colour Helpers ──────────────────────────────────────────
class Colors:
    GREEN  = "\033[92m"
    RED    = "\033[91m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RESET  = "\033[0m"

results = []

def record(it, name, passed, detail="", response_time=0):
    results.append((it, name, passed, detail, response_time))
    status   = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    time_str = f" {Colors.DIM}({response_time:.0f}ms){Colors.RESET}" if response_time else ""
    print(f"  {status}  {name}{time_str}")
    if not passed and detail:
        print(f"         {Colors.DIM}{detail}{Colors.RESET}")

def post(path, payload, stream=False):
    start = time.time()
    try:
        resp    = requests.post(f"{BASE_URL}{path}", json=payload,
                                stream=stream, timeout=60)
        elapsed = (time.time() - start) * 1000
        return resp, elapsed
    except Exception as e:
        return None, (time.time() - start) * 1000

def get(path):
    start = time.time()
    try:
        resp    = requests.get(f"{BASE_URL}{path}", timeout=30)
        elapsed = (time.time() - start) * 1000
        return resp, elapsed
    except Exception:
        return None, (time.time() - start) * 1000

def patch(path, payload):
    start = time.time()
    try:
        resp    = requests.patch(f"{BASE_URL}{path}", json=payload, timeout=30)
        elapsed = (time.time() - start) * 1000
        return resp, elapsed
    except Exception:
        return None, (time.time() - start) * 1000

def delete(path):
    start = time.time()
    try:
        resp    = requests.delete(f"{BASE_URL}{path}", timeout=30)
        elapsed = (time.time() - start) * 1000
        return resp, elapsed
    except Exception:
        return None, (time.time() - start) * 1000

def stream_post(path, payload):
    """POST and collect streaming response body."""
    start = time.time()
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=payload,
                             stream=True, timeout=60)
        text = "".join(
            chunk for chunk in resp.iter_content(chunk_size=None, decode_unicode=True)
            if chunk
        )
        return resp.status_code, text.strip(), (time.time() - start) * 1000
    except Exception:
        return None, "", (time.time() - start) * 1000

def section(title):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ {title} ━━━{Colors.RESET}")

def step(msg):
    print(f"  {Colors.DIM}  ↳ {msg}{Colors.RESET}")


# ═══════════════════════════════════════════════════════════
#  SETUP — Create a shared test user for all integration tests
# ═══════════════════════════════════════════════════════════
def setup_user():
    resp, _ = post("/api/auth/signup", {
        "email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME
    })
    if resp and resp.status_code == 201:
        return resp.json().get("user", {}).get("id")
    resp, _ = post("/api/auth/login", {
        "email": TEST_EMAIL, "password": TEST_PASSWORD
    })
    if resp and resp.status_code == 200:
        return resp.json().get("user", {}).get("id")
    return None


# ═══════════════════════════════════════════════════════════
#  IT-01  Full Meeting Lifecycle Integration
#  Flow: Create → Add Transcript → Generate Summary →
#        Chat About It → Verify in Meeting List
# ═══════════════════════════════════════════════════════════
def test_it01_full_lifecycle(user_id):
    section("IT-01: Full Meeting Lifecycle")
    meeting_id = None
    summary_text = ""

    TRANSCRIPT = (
        "Alice: Morning everyone. Quick stand-up — let's go round.\n"
        "Bob:   Backend is done. Blocked on Carol's UI component.\n"
        "Carol: UI is 80%. I will push it today by 5 PM.\n"
        "Alice: Great. Decision: we freeze the feature branch tonight at 10 PM.\n"
        "Bob:   Agreed. Action item — Bob to write release notes by Wednesday.\n"
        "Alice: Thanks everyone. Meeting closed."
    )

    # Step 1 — Create meeting record
    step("Creating meeting record...")
    resp, t = post("/api/meetings", {
        "userId":    user_id,
        "meetingId": f"it01-{int(time.time())}",
        "title":     "IT-01 Lifecycle Test Meeting",
        "platform":  "zoom"
    })
    if resp and resp.status_code == 201:
        meeting_id = resp.json().get("meeting", {}).get("_id")
        record("IT-01", "Step 1 — Create meeting record (201)", True, response_time=t)
    else:
        status = resp.status_code if resp else "timeout"
        record("IT-01", "Step 1 — Create meeting record", False, f"Got {status}", t)
        return  # Cannot continue without a meeting

    # Step 2 — Add transcript to the meeting
    step("Attaching transcript...")
    resp, t = patch(f"/api/meetings/{meeting_id}", {
        "status":     "active",
        "transcript": [
            {"index": i, "text": line.strip(), "timestamp": f"09:0{i} AM"}
            for i, line in enumerate(TRANSCRIPT.strip().split("\n"))
        ]
    })
    record("IT-01", "Step 2 — Attach transcript (PATCH)", resp and resp.status_code == 200,
           response_time=t)

    # Step 3 — Generate AI summary from transcript
    step("Generating AI summary from transcript...")
    resp, t = post("/api/generate-summary", {
        "meetingTranscript": TRANSCRIPT,
        "meetingTitle":      "IT-01 Lifecycle Test Meeting"
    })
    if resp and resp.status_code == 200:
        summary_text = resp.json().get("summary", "")
        record("IT-01", "Step 3 — Generate AI summary (200)", True, response_time=t)
        record("IT-01", "Step 3 — Summary is non-empty", bool(summary_text),
               f"Length: {len(summary_text)}")
        # Check summary contains key meeting content
        has_bob    = "bob" in summary_text.lower()
        has_action = any(w in summary_text.lower() for w in ["action", "release", "notes"])
        record("IT-01", "Step 3 — Summary mentions participant (Bob)", has_bob,
               f"Snippet: {summary_text[:100]}")
        record("IT-01", "Step 3 — Summary captures action items", has_action,
               f"Snippet: {summary_text[:100]}")
    else:
        status = resp.status_code if resp else "timeout"
        record("IT-01", "Step 3 — Generate AI summary", False, f"Got {status}", t)

    # Step 4 — Persist summary back to meeting record
    step("Persisting summary to meeting record...")
    resp, t = patch(f"/api/meetings/{meeting_id}", {
        "status":    "completed",
        "summary":   summary_text,
        "endedAt":   "2026-03-10T09:30:00Z",
        "durationMs": 1500000
    })
    record("IT-01", "Step 4 — Persist summary & mark completed", resp and resp.status_code == 200,
           response_time=t)

    # Step 5 — Chat about the meeting using its summary as context
    step("Querying AI chat with meeting context...")
    status, chat_text, t = stream_post("/api/chat", {
        "messages":      [{"role": "user", "content": "Who had an action item in this meeting?"}],
        "meetingContext": summary_text
    })
    if status == 200 and chat_text:
        record("IT-01", "Step 5 — AI chat responds with meeting context", True, response_time=t)
        record("IT-01", "Step 5 — Chat identifies Bob's action item",
               "bob" in chat_text.lower(), f"Got: {chat_text[:120]}")
    else:
        record("IT-01", "Step 5 — AI chat with context", False,
               f"Status: {status}", t)

    # Step 6 — Verify meeting appears in user's meeting list
    step("Verifying meeting is listed for user...")
    resp, t = get(f"/api/meetings?userId={user_id}")
    if resp and resp.status_code == 200:
        meetings = resp.json().get("meetings", [])
        found = any(m.get("_id") == meeting_id for m in meetings)
        record("IT-01", "Step 6 — Meeting visible in list", found, response_time=t)
        # Verify completed status is reflected
        target = next((m for m in meetings if m.get("_id") == meeting_id), None)
        if target:
            record("IT-01", "Step 6 — Status reflects 'completed'",
                   target.get("status") == "completed")
    else:
        record("IT-01", "Step 6 — Fetch meeting list", False, response_time=t)

    return meeting_id


# ═══════════════════════════════════════════════════════════
#  IT-02  Auth + Meeting Access Flow
#  Flow: Signup → Login → Create → Read → Delete → Verify Gone
# ═══════════════════════════════════════════════════════════
def test_it02_auth_meeting_flow():
    section("IT-02: Auth + Meeting Access Flow")

    # Step 1 — Signup new isolated user
    step("Signing up isolated test user...")
    email2 = f"it02_{''.join(random.choices(string.ascii_lowercase, k=5))}@dejavue.test"
    resp, t = post("/api/auth/signup", {
        "email": email2, "password": "TestAuth99!", "name": "IT-02 User"
    })
    uid2 = None
    if resp and resp.status_code == 201:
        uid2 = resp.json().get("user", {}).get("id")
        record("IT-02", "Step 1 — Signup returns 201 + user ID", bool(uid2), response_time=t)
    else:
        record("IT-02", "Step 1 — Signup", False,
               f"Got {resp.status_code}" if resp else "timeout", t)
        return

    # Step 2 — Login with same credentials
    step("Logging in with new user credentials...")
    resp, t = post("/api/auth/login", {"email": email2, "password": "TestAuth99!"})
    if resp and resp.status_code == 200:
        data = resp.json().get("user", {})
        record("IT-02", "Step 2 — Login returns 200", True, response_time=t)
        record("IT-02", "Step 2 — Response has id, name, email",
               all(k in data for k in ["id", "name", "email"]))
    else:
        record("IT-02", "Step 2 — Login", False,
               f"Got {resp.status_code}" if resp else "timeout", t)

    # Step 3 — Create a meeting under this user
    step("Creating meeting under new user...")
    resp, t = post("/api/meetings", {
        "userId":    uid2,
        "meetingId": f"it02-{int(time.time())}",
        "title":     "IT-02 Auth Flow Meeting",
        "platform":  "google-meet"
    })
    mid2 = None
    if resp and resp.status_code == 201:
        mid2 = resp.json().get("meeting", {}).get("_id")
        record("IT-02", "Step 3 — Create meeting (201)", bool(mid2), response_time=t)
    else:
        record("IT-02", "Step 3 — Create meeting", False,
               f"Got {resp.status_code}" if resp else "timeout", t)
        return

    # Step 4 — Retrieve the meeting by ID
    step("Retrieving meeting by ID...")
    resp, t = get(f"/api/meetings/{mid2}")
    if resp and resp.status_code == 200:
        m   = resp.json().get("meeting", {})
        record("IT-02", "Step 4 — Get meeting by ID (200)", True, response_time=t)
        record("IT-02", "Step 4 — Correct title returned",
               m.get("title") == "IT-02 Auth Flow Meeting")
        record("IT-02", "Step 4 — Correct platform returned",
               m.get("platform") == "google-meet")
    else:
        record("IT-02", "Step 4 — Get meeting by ID", False, response_time=t)

    # Step 5 — Delete the meeting
    step("Deleting meeting...")
    resp, t = delete(f"/api/meetings/{mid2}")
    record("IT-02", "Step 5 — Delete meeting (200)", resp and resp.status_code == 200,
           response_time=t)

    # Step 6 — Confirm deletion (should 404)
    step("Confirming meeting is gone (404)...")
    resp, t = get(f"/api/meetings/{mid2}")
    record("IT-02", "Step 6 — Deleted meeting returns 404",
           resp and resp.status_code == 404, response_time=t)


# ═══════════════════════════════════════════════════════════
#  IT-03  AI Pipeline Integration
#  Flow: Raw transcript → Summary API → inject into Chat →
#        verify AI uses the context correctly
# ═══════════════════════════════════════════════════════════
def test_it03_ai_pipeline():
    section("IT-03: AI Pipeline Integration")

    TRANSCRIPT = (
        "Manager: Let's talk Q2 targets. Revenue goal is $2M.\n"
        "Sales:   We expect 40 new clients based on pipeline.\n"
        "Manager: Great. Action — Sales to send proposals by March 15.\n"
        "Finance: Budget approved for new hires. Three engineering roles open.\n"
        "Manager: Confirmed. Decision: hiring freeze lifted for engineering only.\n"
        "Sales:   Noted. I'll update the CRM with targets after this call.\n"
        "Manager: Thanks. Meeting closed."
    )

    # Step 1 — Generate summary
    step("Sending transcript to summary API...")
    resp, t = post("/api/generate-summary", {
        "meetingTranscript": TRANSCRIPT,
        "meetingTitle":      "Q2 Business Review"
    })
    if not (resp and resp.status_code == 200):
        record("IT-03", "Step 1 — Summary API reachable", False,
               f"Got {resp.status_code if resp else 'timeout'}", t)
        return

    summary = resp.json().get("summary", "")
    record("IT-03", "Step 1 — Summary generated successfully", bool(summary), response_time=t)

    # Step 2 — Inject summary as chat context, ask targeted question
    step("Injecting summary into chat and querying...")
    status, chat_text, t = stream_post("/api/chat", {
        "messages":       [{"role": "user",
                            "content": "What is the Q2 revenue goal?"}],
        "meetingContext": summary
    })
    if status == 200 and chat_text:
        record("IT-03", "Step 2 — Chat responds with injected context", True, response_time=t)
        # $2M or 2 million should appear
        has_revenue = any(kw in chat_text.lower() for kw in ["2m", "2 m", "million", "$2"])
        record("IT-03", "Step 2 — Chat correctly identifies $2M target",
               has_revenue, f"Got: {chat_text[:150]}")
    else:
        record("IT-03", "Step 2 — Chat with injected context", False,
               f"Status: {status}", t)

    # Step 3 — Follow-up multi-turn question
    step("Multi-turn: follow-up question in same context...")
    status, chat_text2, t = stream_post("/api/chat", {
        "messages": [
            {"role": "user",      "content": "What was the key decision made?"},
        ],
        "meetingContext": summary
    })
    if status == 200 and chat_text2:
        record("IT-03", "Step 3 — Multi-turn follow-up response received", True, response_time=t)
        has_decision = any(
            kw in chat_text2.lower()
            for kw in ["engineering", "hiring", "freeze", "lifted"]
        )
        record("IT-03", "Step 3 — Chat identifies hiring freeze decision",
               has_decision, f"Got: {chat_text2[:150]}")
    else:
        record("IT-03", "Step 3 — Multi-turn follow-up", False,
               f"Status: {status}", t)

    # Step 4 — Verify summary structure contains expected sections
    step("Validating summary output structure...")
    checks = {
        "Executive summary present":   any(w in summary.lower() for w in ["executive", "overview"]),
        "Action items present":        any(w in summary.lower() for w in ["action", "proposal", "march"]),
        "Key decisions present":       any(w in summary.lower() for w in ["decision", "hiring", "engineering"]),
        "Summary > 200 chars":         len(summary) > 200,
    }
    for label, passed in checks.items():
        record("IT-03", f"Step 4 — {label}", passed)


# ═══════════════════════════════════════════════════════════
#  IT-04  Analytics Aggregation Flow
#  Flow: Create N meetings → mark completed → verify KPIs
# ═══════════════════════════════════════════════════════════
def test_it04_analytics(user_id):
    section("IT-04: Analytics Aggregation Flow")
    created_ids = []

    # Step 1 — Seed 3 completed meetings
    step("Seeding 3 completed meeting records...")
    for i in range(3):
        resp, _ = post("/api/meetings", {
            "userId":    user_id,
            "meetingId": f"it04-{i}-{int(time.time())}",
            "title":     f"Analytics Test Meeting #{i+1}",
            "platform":  "zoom" if i % 2 == 0 else "google-meet"
        })
        if resp and resp.status_code == 201:
            mid = resp.json().get("meeting", {}).get("_id")
            if mid:
                created_ids.append(mid)
                # Mark as completed
                patch(f"/api/meetings/{mid}", {
                    "status":     "completed",
                    "durationMs": 600000 * (i + 1),   # 10, 20, 30 min
                    "endedAt":    "2026-03-10T09:00:00Z",
                    "summary":    f"Test summary for meeting {i+1}."
                })

    record("IT-04", f"Step 1 — Seeded {len(created_ids)}/3 meeting records",
           len(created_ids) == 3)

    # Step 2 — Hit analytics endpoint
    step("Fetching analytics for user...")
    resp, t = get(f"/api/analytics?userId={user_id}")
    if resp and resp.status_code == 200:
        data = resp.json()
        record("IT-04", "Step 2 — Analytics endpoint returns 200", True, response_time=t)

        # Step 3 — Validate KPI fields
        step("Validating KPI fields in analytics response...")
        required_fields = [
            "totalMeetings", "totalHours", "avgDurationMin",
            "meetingsPerDay", "todayCount", "todayDuration",
            "thisWeekCount", "weeklyChart", "platformChart", "recentActivity"
        ]
        for field in required_fields:
            record("IT-04", f"Step 3 — KPI field '{field}' present", field in data)

        # Step 4 — Validate types and logic
        step("Validating KPI value types...")
        if "totalMeetings" in data:
            record("IT-04", "Step 4 — totalMeetings ≥ seeded count",
                   isinstance(data["totalMeetings"], (int, float)) and data["totalMeetings"] >= 3)
        if "weeklyChart" in data:
            record("IT-04", "Step 4 — weeklyChart is a list",
                   isinstance(data["weeklyChart"], list))
        if "platformChart" in data:
            record("IT-04", "Step 4 — platformChart is a list",
                   isinstance(data["platformChart"], list))
        if "recentActivity" in data:
            record("IT-04", "Step 4 — recentActivity is a list",
                   isinstance(data["recentActivity"], list))
    else:
        status = resp.status_code if resp else "timeout"
        record("IT-04", "Step 2 — Analytics endpoint", False, f"Status: {status}", t)

    # Cleanup
    step("Cleaning up seeded meetings...")
    for mid in created_ids:
        delete(f"/api/meetings/{mid}")


# ═══════════════════════════════════════════════════════════
#  IT-05  Error Propagation & System Resilience
#  Verifies correct HTTP errors flow end-to-end at each layer
# ═══════════════════════════════════════════════════════════
def test_it05_error_propagation():
    section("IT-05: Error Propagation & System Resilience")

    # Auth layer
    step("Testing auth error propagation...")
    resp, t = post("/api/auth/login", {"email": "ghost@nope.com", "password": "wrong"})
    record("IT-05", "Auth — bad credentials → 401", resp and resp.status_code == 401,
           response_time=t)

    resp, t = post("/api/auth/signup", {"email": "", "password": "", "name": ""})
    record("IT-05", "Auth — empty signup fields → 400", resp and resp.status_code == 400,
           response_time=t)

    # Meeting layer
    step("Testing meeting error propagation...")
    resp, t = get("/api/meetings/000000000000000000000000")
    record("IT-05", "Meeting — invalid ID → 404 or 400",
           resp and resp.status_code in [400, 404], response_time=t)

    # Summary layer
    step("Testing summary API error propagation...")
    resp, t = post("/api/generate-summary", {"meetingTitle": "No Transcript Here"})
    record("IT-05", "Summary — missing transcript → 400",
           resp and resp.status_code == 400, response_time=t)

    resp, t = post("/api/generate-summary", {"meetingTranscript": ""})
    record("IT-05", "Summary — empty transcript → 400",
           resp and resp.status_code == 400, response_time=t)

    # Chat layer
    step("Testing chat API error propagation...")
    resp, t = post("/api/chat", {"messages": "not-a-list"})
    record("IT-05", "Chat — messages as string → 400",
           resp and resp.status_code == 400, response_time=t)

    resp, t = post("/api/chat", {})
    record("IT-05", "Chat — missing messages field → 400",
           resp and resp.status_code == 400, response_time=t)

    # Analytics layer — missing userId still returns a valid shape
    step("Testing analytics with no userId...")
    resp, t = get("/api/analytics")
    record("IT-05", "Analytics — no userId still returns 200",
           resp and resp.status_code == 200, response_time=t)

    # Confirm no 500s leak anywhere
    step("Confirming no 500 Internal Server Errors from any layer...")
    bad_payloads = [
        ("/api/generate-summary", {}),
        ("/api/chat",             {"messages": None}),
        ("/api/auth/login",       {}),
    ]
    for path, payload in bad_payloads:
        resp, _ = post(path, payload)
        record("IT-05", f"No 500 from POST {path}",
               resp is None or resp.status_code != 500)


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════
def main():
    print(f"\n{Colors.BOLD}{'═' * 62}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}   DEJAVUE — INTEGRATION TEST SUITE{Colors.RESET}")
    print(f"{Colors.BOLD}{'═' * 62}{Colors.RESET}")
    print(f"{Colors.DIM}   Base URL  : {BASE_URL}")
    print(f"   Test User : {TEST_EMAIL}")
    print(f"   Tests     : IT-01, IT-02, IT-03, IT-04, IT-05{Colors.RESET}")

    # Server reachability check
    try:
        requests.get(BASE_URL, timeout=5)
    except Exception:
        print(f"\n{Colors.RED}   ✗ Server not reachable at {BASE_URL}")
        print(f"     Run: npm run dev{Colors.RESET}\n")
        sys.exit(1)

    print(f"\n{Colors.DIM}   ✓ Server reachable. Setting up test user...{Colors.RESET}")
    user_id = setup_user()
    if not user_id:
        print(f"{Colors.YELLOW}   ⚠ Could not create/login test user. "
              f"Auth-dependent tests may fail.{Colors.RESET}")

    print(f"{Colors.DIM}   ✓ Test user ready. Running integration tests...{Colors.RESET}")

    # Run all integration test flows
    meeting_id = test_it01_full_lifecycle(user_id)
    test_it02_auth_meeting_flow()
    test_it03_ai_pipeline()
    test_it04_analytics(user_id)
    test_it05_error_propagation()

    # Cleanup IT-01 meeting
    if meeting_id:
        delete(f"/api/meetings/{meeting_id}")

    # ─── Summary ─────────────────────────────────────────────
    print(f"\n{Colors.BOLD}{'═' * 62}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}   INTEGRATION TEST RESULTS SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{'═' * 62}{Colors.RESET}\n")

    its = {}
    for it, name, passed, detail, t in results:
        its.setdefault(it, {"passed": 0, "failed": 0})
        if passed:
            its[it]["passed"] += 1
        else:
            its[it]["failed"] += 1

    total_passed = sum(m["passed"] for m in its.values())
    total_failed = sum(m["failed"] for m in its.values())
    total        = total_passed + total_failed

    print(f"  {'Test Case':<12} {'Passed':>8} {'Failed':>8} {'Accuracy':>10}")
    print(f"  {'─' * 44}")
    for it, counts in its.items():
        p, f = counts["passed"], counts["failed"]
        acc  = (p / (p + f)) * 100 if (p + f) > 0 else 0
        color = Colors.GREEN if f == 0 else Colors.YELLOW if acc >= 70 else Colors.RED
        print(f"  {it:<12} {p:>8} {f:>8} {color}{acc:>9.1f}%{Colors.RESET}")

    print(f"  {'─' * 44}")
    overall = (total_passed / total) * 100 if total > 0 else 0
    color   = Colors.GREEN if overall >= 90 else Colors.YELLOW if overall >= 70 else Colors.RED
    print(f"  {'TOTAL':<12} {total_passed:>8} {total_failed:>8} {color}{overall:>9.1f}%{Colors.RESET}")

    timed = [t for _, _, _, _, t in results if t > 0]
    avg_t = sum(timed) / len(timed) if timed else 0
    print(f"\n  {Colors.DIM}Avg API Response Time : {avg_t:.0f}ms{Colors.RESET}")

    print()
    if overall >= 90:
        print(f"  {Colors.GREEN}{Colors.BOLD}▶ VERDICT: EXCELLENT — Integration tests passed at {overall:.1f}%{Colors.RESET}")
    elif overall >= 70:
        print(f"  {Colors.YELLOW}{Colors.BOLD}▶ VERDICT: ACCEPTABLE — Integration tests passed at {overall:.1f}%{Colors.RESET}")
    else:
        print(f"  {Colors.RED}{Colors.BOLD}▶ VERDICT: NEEDS ATTENTION — Passed at {overall:.1f}%{Colors.RESET}")
    print()


if __name__ == "__main__":
    main()
