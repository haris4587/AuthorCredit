"""Local contract logic tests. The harness stubs GenVM, HTTP and validator prompts."""
import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

REVIEWER = "0x" + "a" * 40
CONTRIBUTOR = "0x" + "b" * 40
BASE = "https://raw.githubusercontent.com/demo/papers/" + "a" * 40 + "/"


def load_contract():
    sdk = ModuleType("genlayer")
    identity = lambda fn: fn
    sdk.gl = SimpleNamespace(
        Contract=object, public=SimpleNamespace(view=identity, write=identity),
        message=SimpleNamespace(sender_address=REVIEWER),
        vm=SimpleNamespace(UserError=ValueError),
        eq_principle=SimpleNamespace(strict_eq=lambda fn: fn()),
        nondet=SimpleNamespace(web=SimpleNamespace(get=None), exec_prompt=None),
    )
    sdk.u256 = int
    sdk.TreeMap = dict
    spec = importlib.util.spec_from_file_location(
        "author_credit", Path(__file__).resolve().parents[1] / "contracts" / "author_credit.py"
    )
    contract = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"genlayer": sdk}):
        spec.loader.exec_module(contract)
    return contract


class AuthorCreditTests(unittest.TestCase):
    def setUp(self):
        self.module = load_contract()
        self.vm = self.module.gl
        self.app = self.module.AuthorCredit()
        self.app.cases = {}
        self.policy = b"Demo policy with four gates"
        self.evidence = b"Demo contribution and drafting record"
        self.vm.nondet.web.get = lambda url: SimpleNamespace(
            status=200, body=self.policy if url.endswith("policy.txt") else self.evidence
        )
        self.vm.nondet.exec_prompt = lambda prompt: "1|1"
        self.case = self.app.open_case("candidate-01", CONTRIBUTOR, BASE + "policy.txt", self.sha(self.policy))

    def sha(self, body):
        return hashlib.sha256(body).hexdigest()

    def submit(self, digest=None, approval=True):
        self.vm.message.sender_address = CONTRIBUTOR
        self.app.submit_evidence(self.case, [BASE + "revision.txt"], [digest or self.sha(self.evidence)], approval, True)

    def review(self):
        self.vm.message.sender_address = REVIEWER
        self.app.review_case(self.case)
        return json.loads(self.app.get_case(self.case))["receipt"]

    def test_verified_artifact_and_two_attestations(self):
        self.submit()
        receipt = self.review()
        self.assertEqual(receipt["outcome"], "CRITERIA_SUPPORTED")
        self.assertEqual(receipt["findings"], {"contribution": 1, "manuscript": 1})

    def test_digest_mismatch_never_reaches_model(self):
        self.submit(digest="0" * 64)
        self.vm.nondet.exec_prompt = lambda prompt: self.fail("Unexpected model call")
        self.assertEqual(self.review()["reason"], "SOURCE_UNAVAILABLE_OR_MISMATCH")

    def test_unknown_or_out_of_range_model_output(self):
        self.submit()
        self.vm.nondet.exec_prompt = lambda prompt: "12|1"
        self.assertEqual(self.review()["outcome"], "INCONCLUSIVE")

    def test_missing_attestation_blocks_positive(self):
        self.submit(approval=False)
        self.assertEqual(self.review()["outcome"], "CRITERIA_NOT_MET")

    def test_authorization_and_one_way_state_transitions(self):
        with self.assertRaises(ValueError):
            self.app.submit_evidence(self.case, [BASE + "revision.txt"], [self.sha(self.evidence)], True, True)
        self.submit()
        with self.assertRaises(ValueError):
            self.app.review_case(self.case)
        with self.assertRaises(ValueError):
            self.submit()
        self.review()
        with self.assertRaises(ValueError):
            self.review()

    def test_moving_and_traversal_urls_rejected(self):
        for url in [BASE.replace("a" * 40, "main"), BASE + "../policy.txt"]:
            with self.assertRaises(ValueError):
                self.module.source_ref(url, self.sha(self.policy))

    def test_invalid_wallet_and_unknown_case(self):
        with self.assertRaises(ValueError):
            self.app.open_case("candidate", "0x" + "0" * 40, BASE + "policy.txt", self.sha(self.policy))
        self.assertEqual(self.app.get_case(2), "")


if __name__ == "__main__":
    unittest.main()
