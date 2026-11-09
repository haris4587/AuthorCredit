# AuthorCredit · Project Explorer submission

**Project summary**  
AuthorCredit helps universities and research teams review disputed academic authorship claims. A reviewer locks a published authorship policy and assigns a contributor wallet. The contributor submits commit-pinned records and signs final approval and accountability attestations. Independent GenLayer validators verify the policy and evidence bytes and assess documented research contribution and substantive manuscript work. A finalized record links the recommendation to the policy and evidence so reviewers can reproduce the source checks. Institutions retain final authority over authorship decisions.

**Reviewer walkthrough**

1. Open the website and inspect finalized case **1**. No wallet is needed.
2. Open the pinned policy and evidence links, compare their digests and download the case receipt.
3. To run a new demonstration, connect a Studionet wallet, fill the sample inputs and follow the reviewer → contributor → reviewer workflow. Use Studio's built-in account for direct contract testing.

**Evidence**

- [Source repository](https://github.com/haris4587/AuthorCredit)
- [Studionet contract](https://explorer-studio.genlayer.com/address/0x6CCA538d236F96f6d565a6F180893f664ea6B733)
- Deployment transaction `0xf00ba6db0213a190995c81dc42b60aa503232133a7752f0230009b8ec0c54576`
- Local verification with `npm test` and `npm run build`
- [Open case transaction](https://explorer-studio.genlayer.com/tx/0x6cda58579864cc5b6a9931b199f7428392111e1eb3de5ddc2bce4d6477768dfb)
- [Evidence submission transaction](https://explorer-studio.genlayer.com/tx/0xeab8c686cfab024f98fe870d4977cb0dc0d4e465c4e7239ec7c402f897f78537)
- [Full-consensus review transaction](https://explorer-studio.genlayer.com/tx/0x77246b39398b54316e13087955eb85b23cc2e031a9a8f0f85d34cf19a041b2a0)
- Demo result: `CRITERIA_NOT_MET`. Validators cited evidence 1 for both qualitative gates. The recorded final approval attestation was false, so the contract withheld a positive recommendation.
