# AuthorCredit

AuthorCredit gives research teams a reproducible way to review disputed authorship claims. An institutional reviewer locks a published four-gate policy. A designated contributor submits references to documented research work and manuscript revisions, then signs two attestations. GenLayer validators independently retrieve and verify the policy and evidence bytes and assess whether the documents support the named candidate's contribution. A public receipt records the recommendation and cites supporting artifacts.

**Studionet** (61999) · [Contract](https://explorer-studio.genlayer.com/address/0x6CCA538d236F96f6d565a6F180893f664ea6B733) · [Studio](https://studio.genlayer.com/run-debug)

## Try it

1. Use the website's **Inspect a case** panel and enter case **1** to read the synthetic demonstration from finalized state. You can open its source files, check the stored SHA-256 values and download the JSON record.
2. To create your own case, connect an EIP-1193 wallet on Studionet. **Fill sample inputs** loads synthetic policy and evidence references. Assign a contributor wallet and open the case.
3. As that contributor, use the new case ID and submit one to three evidence references. Record final-version approval and accountability as appropriate. As the reviewer, reload the finalized case and run the validator review.
4. Follow the submitted hash through finalization. Finalization and execution success are shown separately. If tracking pauses or the page reloads, resume with the same transaction hash.
5. For built-in wallet testing, import [the contract](contracts/author_credit.py) into GenLayer Studio, use **Normal (Full Consensus)** and deploy or attach to the contract. The built-in account signs inside Studio. The standalone site uses an injected wallet for writes and supports wallet-free reads.

Each policy and evidence file must be public UTF-8 text of 1–10,000 bytes. Use a raw GitHub URL pinned to a full commit SHA and a SHA-256 of the exact downloaded bytes. The [fixtures](fixtures) are fictional. For a real review, use published policy text and authorized records from the institution or journal. A digest authenticates bytes against the committed reference. An institution still needs to verify repository control, the applicability of its policy, the candidate's identity and the provenance of each record.

## How it works

- **Open → submitted → reviewed.** The reviewer locks the policy and contributor address, the contributor signs the evidence submission, and the reviewer triggers a single assessment. A revised evidence packet requires a new case.
- **Four gates.** The validators assess documented substantial contribution and drafting or substantive revision. Two signed boolean fields record final approval and accountability. An attestation represents the wallet's statement.
- **Independent validators.** Each run checks pinned bytes and returns a compact recommendation. The equivalence function compares the normalized results. Disagreement can leave a write without a successful receipt. The existing case remains available for the reviewer to inspect and retry if the review did not execute successfully.
- **Outcomes.** `CRITERIA_SUPPORTED` requires evidence for both qualitative gates and both attestations. `CRITERIA_NOT_MET` covers explicit contradiction or a missing attestation where both qualitative gates were classifiable. `INCONCLUSIVE` covers insufficient evidence, incompatible policy, unavailable or changed sources, and invalid model output.
- **Scope.** This is a public Studionet demonstration. Use synthetic or explicitly authorized public material. Institutions retain final authority over authorship. Avoid unpublished manuscript text, confidential correspondence and personal information.

## Run locally

Requires Node.js 22.12+ and Python 3.10+.

```sh
npm ci
npm test
npm run dev
npm run build
```

The unit tests use stubs for GenVM, HTTP and prompt execution. Live transaction and case evidence are listed in [submission notes](SUBMISSION.md).
