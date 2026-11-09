import { abi, createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import './style.css'

const address = '0x6CCA538d236F96f6d565a6F180893f664ea6B733'
const explorer = 'https://explorer-studio.genlayer.com'
const chainId = '0x' + studionet.id.toString(16)
const client = createClient({ chain: studionet })
const sample = 'https://raw.githubusercontent.com/haris4587/AuthorCredit/5b3e7a040b70add3caa3c3999312ba7394233b55/fixtures/'
const hashPattern = /^0x[0-9a-fA-F]{64}$/
const addressPattern = /^0x[0-9a-fA-F]{40}$/
const pinnedPattern = /^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[a-f0-9]{40}\/[\w./-]+$/
const $ = id => document.getElementById(id)
const field = (form, name) => form.elements.namedItem(name)
const value = (form, name) => field(form, name).value.trim()
const message = error => error?.shortMessage || error?.message || String(error)
const activeKey = 'authorcredit/studionet/' + address
let record
let account
let signing = false
let tracking = 0
let readRequest = 0

$('contract-link').href = explorer + '/address/' + address
const setTx = text => { $('tx-status').textContent = text }

function setAccount(next) {
  account = next
  $('connect').textContent = next ? next.slice(0, 6) + '…' + next.slice(-4) : 'Connect wallet'
  $('review').hidden = !(record?.status === 'SUBMITTED' && account &&
    record.reviewer.toLowerCase() === account.toLowerCase())
}

async function connect() {
  const provider = window.ethereum
  if (!provider) throw new Error('No browser wallet detected. Use GenLayer Studio for built-in signing or install an EIP-1193 wallet for website writes.')
  const [next] = await provider.request({ method: 'eth_requestAccounts' })
  if (!addressPattern.test(next)) throw new Error('The wallet returned no usable account.')
  if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
    } catch (error) {
      if (error.code !== 4902 && error.data?.originalError?.code !== 4902) throw error
      await provider.request({ method: 'wallet_addEthereumChain', params: [{
        chainId, chainName: 'GenLayer Studionet',
        rpcUrls: studionet.rpcUrls.default.http,
        nativeCurrency: studionet.nativeCurrency, blockExplorerUrls: [explorer]
      }] })
      if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
      }
    }
  }
  setAccount(next)
  return createClient({ chain: studionet, account: next, provider })
}

function checkRef(url, digest) {
  if (url.length > 240 || !pinnedPattern.test(url) ||
      url.split('/').slice(3).some(part => !part || part === '.' || part === '..')) {
    throw new Error('Use a raw GitHub HTTPS URL pinned to a full lowercase commit.')
  }
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Use a lowercase SHA-256 digest.')
}

function caseId(input) {
  if (!/^[1-9][0-9]{0,77}$/.test(input) || BigInt(input) >= 2n ** 256n) {
    throw new Error('Enter a positive case ID within the contract range.')
  }
  return BigInt(input)
}

function renderCase(next) {
  record = next
  const panel = $('case')
  panel.replaceChildren()
  panel.hidden = !next
  $('download').hidden = !next
  setAccount(account)
  if (!next) return
  const dl = document.createElement('dl')
  function entry(label, data, url) {
    const term = document.createElement('dt')
    term.textContent = label
    const details = document.createElement('dd')
    details.textContent = data
    if (url && pinnedPattern.test(url)) {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = ' Open pinned file ↗'
      details.append(link)
    }
    dl.append(term, details)
  }
  entry('Case ' + next.id, next.candidate + ' · ' + next.status)
  entry('Reviewer', next.reviewer)
  entry('Contributor', next.contributor)
  entry('Policy SHA-256', next.policy.sha256, next.policy.url)
  next.evidence?.forEach((ref, i) => entry('Evidence ' + (i + 1) + ' SHA-256', ref.sha256, ref.url))
  if (next.evidence) {
    entry('Final approval', next.approval ? 'Attested' : 'Not attested')
    entry('Accountability', next.accountability ? 'Attested' : 'Not attested')
  }
  if (next.receipt) {
    entry('Recommendation', next.receipt.outcome.replaceAll('_', ' '))
    if (next.receipt.reason) entry('Reason', next.receipt.reason.replaceAll('_', ' '))
    for (const [gate, finding] of Object.entries(next.receipt.findings ?? {})) {
      const label = gate === 'contribution' ? 'Substantial contribution' : 'Drafting or revision'
      entry(label, finding > 0 ? 'Supported by evidence ' + finding :
        finding === -1 ? 'Contradicted by evidence' : 'Evidence insufficient or attribution uncertain')
    }
  }
  panel.append(dl)
}

async function readCase(input) {
  const request = ++readRequest
  renderCase(undefined)
  $('read-status').textContent = 'Reading finalized state…'
  try {
    const id = caseId(input)
    const raw = await client.readContract({ address, functionName: 'get_case', args: [id],
      transactionHashVariant: 'finalized' })
    if (request !== readRequest) return
    if (typeof raw !== 'string') throw new Error('Unexpected contract response.')
    renderCase(raw ? JSON.parse(raw) : undefined)
    $('read-status').textContent = raw ? 'Loaded from finalized Studionet state.' : 'No finalized record for this ID.'
  } catch (error) {
    if (request === readRequest) $('read-status').textContent = message(error)
  }
}

function finish(receipt, meta) {
  const leaders = receipt.consensus_data?.leader_receipt
  const leader = Array.isArray(leaders) ? leaders.at(-1) : leaders
  const execution = receipt.txExecutionResultName ?? leader?.execution_result
  if (!['FINISHED_WITH_RETURN', 'SUCCESS'].includes(execution) || leader?.result?.status !== 'return') {
    const detail = typeof leader?.result?.payload === 'string' ? leader.result.payload : execution
    setTx('Finalized · ' + (detail || 'execution result unavailable') + '. Inspect the explorer before retrying.')
    return
  }
  setTx('Finalized · contract execution succeeded.')
  const bytes = leader.result.payload?.raw
  const returned = meta.method === 'open_case' && Array.isArray(bytes)
    ? abi.calldata.decode(Uint8Array.from(bytes)) : undefined
  const id = meta.caseId || (typeof returned === 'bigint' || typeof returned === 'number' ? String(returned) : '')
  if (id) {
    field($('inspect'), 'caseId').value = id
    field($('submit'), 'caseId').value = id
    void readCase(id)
  } else if (meta.method === 'open_case') {
    setTx('Finalized · case opened. Find its returned case ID in the explorer.')
  }
}

async function track(meta) {
  const run = ++tracking
  field($('track'), 'hash').value = meta.hash
  $('tx-link').href = explorer + '/tx/' + meta.hash
  $('tx-link').hidden = false
  setTx('Submitted · waiting for the network.')
  for (let attempt = 0; attempt < 90 && run === tracking; attempt++) {
    let receipt
    try { receipt = await client.getTransaction({ hash: meta.hash }) } catch { /* Indexing can lag. */ }
    if (run !== tracking) return
    const status = receipt?.statusName ?? receipt?.status_name
    if (status === 'FINALIZED' || status === 'CANCELED') {
      if (localStorage.getItem(activeKey) && JSON.parse(localStorage.getItem(activeKey)).hash === meta.hash) {
        localStorage.removeItem(activeKey)
      }
      if (status === 'FINALIZED') finish(receipt, meta)
      else setTx('Canceled by the network. Inspect the explorer for details.')
      return
    }
    if (status) setTx(status.replaceAll('_', ' ') + ' · waiting for finalization.')
    await new Promise(resolve => setTimeout(resolve, 3500))
  }
  if (run === tracking) setTx('Tracking paused. Resume with the same transaction hash.')
}

async function write(method, args, id) {
  if (signing) return
  if (localStorage.getItem(activeKey)) {
    setTx('A previous website write is still pending. Track it to finalization before submitting again.')
    return
  }
  signing = true
  ++tracking
  $('tx-link').hidden = true
  setTx('Waiting for wallet approval…')
  try {
    const wallet = await connect()
    const hash = await wallet.writeContract({ address, functionName: method, args, value: 0n, leaderOnly: false })
    if (!hashPattern.test(hash)) throw new Error('The wallet did not return a trackable transaction hash.')
    const meta = { hash, method, caseId: id ? String(id) : '' }
    localStorage.setItem(activeKey, JSON.stringify(meta))
    void track(meta)
  } catch (error) {
    setTx(message(error))
  } finally {
    signing = false
  }
}

function formAction(id, handler) {
  const form = $(id)
  form.addEventListener('submit', event => {
    event.preventDefault()
    try { handler(form) } catch (error) { setTx(message(error)) }
  })
}

$('connect').addEventListener('click', async () => {
  try { await connect() } catch (error) { setTx(message(error)) }
})
window.ethereum?.on?.('accountsChanged', accounts => setAccount(accounts[0]))
$('demo').addEventListener('click', () => {
  field($('open'), 'candidate').value = 'coastal-demo-17'
  if (account) field($('open'), 'contributor').value = account
  field($('open'), 'url').value = sample + 'policy.txt'
  field($('open'), 'digest').value = 'f01762c796f3639fad7aba2943328d47303cab989d1c387e2a0493549c02c591'
  field($('submit'), 'refs').value = sample + 'revision.txt 45e13d6a6ebe5cd55e22661121d60888c7c985ac65c42b4ddf246c250af1a2ce'
})
formAction('open', form => {
  const url = value(form, 'url')
  const digest = value(form, 'digest')
  checkRef(url, digest)
  const contributor = value(form, 'contributor')
  void write('open_case', [value(form, 'candidate'), contributor, url, digest])
})
formAction('submit', form => {
  const id = caseId(value(form, 'caseId'))
  const refs = value(form, 'refs').split(/\r?\n/).filter(line => line.trim()).map(line => line.trim().split(/\s+/))
  if (refs.length < 1 || refs.length > 3 || refs.some(ref => ref.length !== 2)) {
    throw new Error('Provide one to three URL and SHA-256 pairs, one per line.')
  }
  refs.forEach(ref => checkRef(...ref))
  void write('submit_evidence', [id, refs.map(([url]) => url), refs.map(([, digest]) => digest),
    field(form, 'approval').checked, field(form, 'accountability').checked], id)
})
formAction('inspect', form => { void readCase(value(form, 'caseId')) })
$('demo-case').addEventListener('click', () => {
  field($('inspect'), 'caseId').value = '1'
  void readCase('1')
})
formAction('track', form => {
  const hash = value(form, 'hash')
  const saved = JSON.parse(localStorage.getItem(activeKey) || 'null')
  void track(saved?.hash === hash ? saved : { hash })
})
$('review').addEventListener('click', () => { void write('review_case', [caseId(record.id)], record.id) })
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'authorcredit-case-' + record.id + '.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
const saved = JSON.parse(localStorage.getItem(activeKey) || 'null')
if (hashPattern.test(saved?.hash)) void track(saved)
