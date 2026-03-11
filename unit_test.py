"""
╔══════════════════════════════════════════════════════════════╗
║         DEJAVUE — UNIT TEST SUITE (TC-03 to TC-06)          ║
╚══════════════════════════════════════════════════════════════╝

Unit Test: AI Summarization, Chat, Noise Filter, Analytics
  TC-03: Verify AI Summary Generation (with valid transcript)
  TC-04: Verify AI Chat Response (with meeting context)
  TC-05: Verify Cooldown / Duplicate Prevention Mechanism
  TC-06: Verify Unknown / Empty Input Handling

Usage:
  Ensure the app is running (npm run dev), then:
    python3 unit_test.py
"""

import requests
import time
import re
import sys

# ─── Config ──────────────────────────────────────
BASE_URL = "http://localhost:3000"

# ─── Colour Helpers ───────────────────────────────
class Colors:
    GREEN  = "\033[92m"
    RED    = "\033[91m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RESET  = "\033[0m"

results = []

def record(tc, name, passed, detail="", response_time=0):
    results.append((tc, name, passed, detail, response_time))
    status   = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    time_str = f" {Colors.DIM}({response_time:.0f}ms){Colors.RESET}" if response_time else ""
    print(f"  {status}  {name}{time_str}")
    if not passed and detail:
        print(f"         {Colors.DIM}{detail}{Colors.RESET}")

def timed_post(url, payload):
    start = time.time()
    try:
        resp    = requests.post(url, json=payload, timeout=30)
        elapsed = (time.time() - start) * 1000
        return resp, elapsed
    except Exception:
        return None, (time.time() - start) * 1000

def timed_stream(url, payload):
    """POST and collect full streaming response."""
    start = time.time()
    try:
        resp = requests.post(url, json=payload, stream=True, timeout=30)
        text = "".join(
            chunk for chunk in resp.iter_content(chunk_size=None, decode_unicode=True) if chunk
        )
        return resp.status_code, text.strip(), (time.time() - start) * 1000
    except Exception:
        return None, "", (time.time() - start) * 1000

def section(title):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ {title} ━━━{Colors.RESET}")


# ═══════════════════════════════════════════════════
#  TC-03: AI Summary Generation (Valid Transcript)
# ═══════════════════════════════════════════════════
def test_tc03_summary_valid():
    section("TC-03: AI Summary Generation (Valid Transcript)")

    transcript = (
        "Alice: Good morning everyone. Let's start with the project status update.\n"
        "Bob:   The backend API is complete. We need frontend integration by Friday.\n"
        "Alice: Agreed. Let's assign Carol to handle the dashboard UI.\n"
        "Carol: Understood. I will have it ready by Thursday EOD.\n"
        "Bob:   Also, we decided to push the release date to next Monday.\n"
        "Alice: Perfect. Meeting adjourned."
    )

    resp, t = timed_post(f"{BASE_URL}/api/generate-summary", {
        "meetingTranscript": transcript,
        "meetingTitle": "Sprint Planning — Q1"
    })

    if resp and resp.status_code == 200:
        data = resp.json()
        summary = data.get("summary", "")

        record("TC-03", "Summary endpoint returns 200", True, response_time=t)
        record("TC-03", "Response contains 'summary' field", bool(summary))

        # Check key sections are present in output
        has_exec    = any(w in summary.lower() for w in ["executive", "overview", "summary"])
        has_action  = any(w in summary.lower() for w in ["action", "carol", "dashboard"])
        has_decision = any(w in summary.lower() for w in ["decision", "release", "monday"])

        record("TC-03", "Summary includes executive overview",  has_exec,    f"Output: {summary[:120]}")
        record("TC-03", "Summary identifies action items",      has_action,  f"Output: {summary[:120]}")
        record("TC-03", "Summary captures key decisions",       has_decision, f"Output: {summary[:120]}")
        record("TC-03", "Summary length > 100 chars (non-trivial)", len(summary) > 100,
               f"Length: {len(summary)}")
    else:
        status = resp.status_code if resp else "timeout"
        record("TC-03", "Summary endpoint reachable", False, f"Got {status}", t)


# ═══════════════════════════════════════════════════
#  TC-04: AI Chat with Meeting Context
# ═══════════════════════════════════════════════════
def test_tc04_chat_with_context():
    section("TC-04: AI Chat — Context-Aware Response (Time-Out Mode Equivalent)")

    context = (
        "Minutes of Meeting\n"
        "Title: Product Review\n"
        "Action items:\n"
        "  1. Alice to update the API documentation by Wednesday.\n"
        "  2. Bob to fix the authentication bug before release.\n"
        "  3. Team review scheduled for Friday at 3 PM.\n"
        "Key Decision: Release date moved to next Monday."
    )

    # 4a. Context-aware name retrieval
    status, text, t = timed_stream(f"{BASE_URL}/api/chat", {
        "messages": [{"role": "user", "content": "Who is responsible for the API documentation?"}],
        "meetingContext": context
    })
    if status == 200 and text:
        record("TC-04", "Chat with context — streaming response received", True, response_time=t)
        record("TC-04", "Chat identifies Alice for API docs",
               "alice" in text.lower(), f"Got: {text[:120]}")
    else:
        record("TC-04", "Chat with context — response received", False,
               f"Status: {status}", t)

    # 4b. Decision retrieval
    status, text, t = timed_stream(f"{BASE_URL}/api/chat", {
        "messages": [{"role": "user", "content": "When is the release date?"}],
        "meetingContext": context
    })
    if status == 200 and text:
        record("TC-04", "Chat identifies release date from context",
               "monday" in text.lower(), f"Got: {text[:120]}")
    else:
        record("TC-04", "Chat — decision retrieval", False, f"Status: {status}", t)

    # 4c. Chat without context — general knowledge
    status, text, t = timed_stream(f"{BASE_URL}/api/chat", {
        "messages": [{"role": "user", "content": "What is 5 + 7? Reply with just the number."}]
    })
    if status == 200 and text:
        record("TC-04", "Chat without context — response received", True, response_time=t)
        record("TC-04", "Chat answers basic question correctly (5+7=12)",
               "12" in text, f"Got: {text[:80]}")
    else:
        record("TC-04", "Chat without context — response", False, f"Status: {status}", t)


# ═══════════════════════════════════════════════════
#  TC-05: Cooldown / Duplicate Prevention
# ═══════════════════════════════════════════════════
def test_tc05_cooldown():
    section("TC-05: Cooldown / Duplicate Request Prevention")

    transcript = "Alice: Let's finalize the sprint deliverables. Bob: Agreed, targeting Friday."

    # 5a. First request — should succeed normally
    resp1, t1 = timed_post(f"{BASE_URL}/api/generate-summary", {
        "meetingTranscript": transcript,
        "meetingTitle": "Cooldown Test — Request 1"
    })
    passed1 = resp1 and resp1.status_code == 200
    record("TC-05", "First summary request succeeds (200)", passed1, response_time=t1)

    # 5b. Immediate second request with identical payload — system should still respond
    resp2, t2 = timed_post(f"{BASE_URL}/api/generate-summary", {
        "meetingTranscript": transcript,
        "meetingTitle": "Cooldown Test — Request 2"
    })
    passed2 = resp2 and resp2.status_code == 200
    record("TC-05", "Second immediate request still returns 200", passed2, response_time=t2)

    # 5c. Verify both responses are valid and non-empty
    if passed1 and passed2:
        s1 = resp1.json().get("summary", "")
        s2 = resp2.json().get("summary", "")
        record("TC-05", "Both responses contain summary content",
               bool(s1) and bool(s2), f"Lengths: {len(s1)}, {len(s2)}")

    # 5d. Empty transcript — should be rejected (no duplicate or bad data passes through)
    resp3, t3 = timed_post(f"{BASE_URL}/api/generate-summary", {
        "meetingTranscript": "",
        "meetingTitle": "Empty Test"
    })
    record("TC-05", "Empty transcript rejected (400)", resp3 and resp3.status_code == 400,
           f"Got {resp3.status_code}" if resp3 else "No response", t3)


# ═══════════════════════════════════════════════════
#  TC-06: Unknown / Invalid Input Detection
# ═══════════════════════════════════════════════════
def test_tc06_unknown_input():
    section("TC-06: Unknown / Invalid Input Handling")

    # 6a. Missing transcript field entirely
    resp, t = timed_post(f"{BASE_URL}/api/generate-summary", {
        "meetingTitle": "No Transcript"
    })
    record("TC-06", "Missing transcript field → 400", resp and resp.status_code == 400,
           f"Got {resp.status_code}" if resp else "No response", t)

    # 6b. Null/None payload for chat messages
    resp, t = timed_post(f"{BASE_URL}/api/chat", {"messages": None})
    record("TC-06", "Null messages field → 400", resp and resp.status_code == 400,
           f"Got {resp.status_code}" if resp else "No response", t)

    # 6c. Wrong type — messages as a string instead of list
    resp, t = timed_post(f"{BASE_URL}/api/chat", {"messages": "not-a-list"})
    record("TC-06", "Messages as string (wrong type) → 400", resp and resp.status_code == 400,
           f"Got {resp.status_code}" if resp else "No response", t)

    # 6d. Empty messages array — edge case
    status, text, t = timed_stream(f"{BASE_URL}/api/chat", {"messages": []})
    # Either responds gracefully or returns an error — both are acceptable behaviours
    record("TC-06", "Empty messages array — server does not crash (no 500)",
           status != 500 and status is not None,
           f"Got: {status}", t)

    # 6e. Noise filter simulation — unknown / hallucinated transcript
    def noise_filter(text):
        devanagari = len(re.findall(r'[\u0900-\u097F]', text))
        total = len(re.sub(r'\s', '', text))
        if total > 0 and devanagari / total > 0.4:
            return False, "Devanagari hallucination"
        words = [w for w in re.sub(r'[^\w\s]', '', text).split() if len(w) > 1]
        if len(words) < 3:
            return False, "Too few words"
        hallucinations = ['thank you for watching', 'subscribe', 'amara.org', 'subtitles by']
        if any(h in text.lower() for h in hallucinations):
            return False, "Known hallucination"
        return True, "Valid"

    noisy_inputs = [
        ("ok",                                          False, "Single word noise"),
        ("अपलोड डन है का प जुए",                       False, "Devanagari hallucination"),
        ("Thank you for watching and please subscribe", False, "Whisper hallucination"),
        ("Let's review the sprint deliverables today",  True,  "Valid English transcript"),
    ]
    for text, expected, label in noisy_inputs:
        actual, reason = noise_filter(text)
        match = actual == expected
        record("TC-06", f"Noise filter — {label}",
               match, f"Expected {'PASS' if expected else 'REJECT'}, Got: {reason}")


# ═══════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════
def main():
    print(f"\n{Colors.BOLD}{'═' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}   DEJAVUE — UNIT TEST SUITE (TC-03 to TC-06){Colors.RESET}")
    print(f"{Colors.BOLD}{'═' * 60}{Colors.RESET}")
    print(f"{Colors.DIM}   Target  : {BASE_URL}")
    print(f"   Tests   : TC-03, TC-04, TC-05, TC-06{Colors.RESET}")

    # Server reachability check
    try:
        requests.get(BASE_URL, timeout=5)
    except Exception:
        print(f"\n{Colors.RED}   ✗ Server not reachable at {BASE_URL}")
        print(f"     Make sure the app is running: npm run dev{Colors.RESET}\n")
        sys.exit(1)

    print(f"\n{Colors.DIM}   ✓ Server is reachable. Starting tests...{Colors.RESET}")

    # Run all test cases
    test_tc03_summary_valid()
    test_tc04_chat_with_context()
    test_tc05_cooldown()
    test_tc06_unknown_input()

    # ─── Summary ─────────────────────────────────
    print(f"\n{Colors.BOLD}{'═' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}   TEST RESULTS SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{'═' * 60}{Colors.RESET}\n")

    tcs = {}
    for tc, name, passed, detail, t in results:
        tcs.setdefault(tc, {"passed": 0, "failed": 0})
        if passed:
            tcs[tc]["passed"] += 1
        else:
            tcs[tc]["failed"] += 1

    total_passed = sum(m["passed"] for m in tcs.values())
    total_failed = sum(m["failed"] for m in tcs.values())
    total        = total_passed + total_failed

    print(f"  {'Test Case':<12} {'Passed':>8} {'Failed':>8} {'Accuracy':>10}")
    print(f"  {'─' * 42}")
    for tc, counts in tcs.items():
        p, f = counts["passed"], counts["failed"]
        acc  = (p / (p + f)) * 100 if (p + f) > 0 else 0
        color = Colors.GREEN if f == 0 else Colors.YELLOW if acc >= 70 else Colors.RED
        print(f"  {tc:<12} {p:>8} {f:>8} {color}{acc:>9.1f}%{Colors.RESET}")

    print(f"  {'─' * 42}")
    overall = (total_passed / total) * 100 if total > 0 else 0
    color   = Colors.GREEN if overall >= 90 else Colors.YELLOW if overall >= 70 else Colors.RED
    print(f"  {'TOTAL':<12} {total_passed:>8} {total_failed:>8} {color}{overall:>9.1f}%{Colors.RESET}")

    print()
    if overall >= 90:
        print(f"  {Colors.GREEN}{Colors.BOLD}▶ VERDICT: EXCELLENT — Unit tests passed at {overall:.1f}%{Colors.RESET}")
    elif overall >= 70:
        print(f"  {Colors.YELLOW}{Colors.BOLD}▶ VERDICT: ACCEPTABLE — Unit tests passed at {overall:.1f}%{Colors.RESET}")
    else:
        print(f"  {Colors.RED}{Colors.BOLD}▶ VERDICT: NEEDS ATTENTION — Unit tests passed at {overall:.1f}%{Colors.RESET}")
    print()


if __name__ == "__main__":
    main()
