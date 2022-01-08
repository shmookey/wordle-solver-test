#!/usr/bin/env node
import {promisify} from 'util'
import {readFile as readFile2} from 'fs'
import {exec as exec2} from 'child_process'

const synopsis = `
wstest - wordle solver testbench

  wstest <SOLVER> [WORDS]

Runs <SOLVER> against each word specified in a word list file, or from the
command line. If words are specified as command line arguments, a detailed
step-by-step breakdown of each round is shown. If no words are given as
arguments, a word list is loaded from a file specified in the WORDLE_LIST
environment variable, defaulting to WORDS if not set. In this mode, only the
outcome for each word is shown, and a summary of the solver's performance is
printed upon completion.

SOLVER is interpreted as a shell command, so the syntax ./solver is required
if the solver is in the working directory but not in PATH. A command that
contains spaces should be written in quotation marks, e.g. 'node solver.js'.

To speed up testing against large word lists, the testbench may run multiple
instances of the solver in parallel. The number of threads may be set with
the environment variable WORDLE_THREADS. If this value is not set, it defaults
to the number of logical processor cores in the system.
`.trim()

const readFile = promisify(readFile2)
const exec = promisify(exec2)
const dict_file = process.env['WORDLE_LIST'] ?? 'WORDS'
const sprintC = (x, bg, fg) => `\x1B[${fg};${bg}m${x}\x1B[0m`
let show_summary = false
let show_details = false
let words = null

const args = process.argv.slice(2)
const solver = args[0]
if(args.length == 0) {
  console.log(synopsis)
  process.exit(0)
} else if(args.length == 1) {
  show_summary = true
  words = (await readFile(dict_file)).toString().trim().split('\n')
} else {
  show_details = true
  words = args.slice(1)
}

let activeCommands = 0
const pendingCommands = []
async function execNext() {
  if(pendingCommands.length == 0) return
  const [promise, finalise, cmd] = pendingCommands.shift()
  activeCommands += 1
  exec(cmd).then(x => {
    activeCommands -= 1
    execNext()
    finalise.resolve(x)
  })
  .catch(finalise.reject)

}
async function execParallel(cmd) {
  const finalise = {resolve: null, reject: null}
  const promise = new Promise((resolve, reject) => {
    finalise.resolve = resolve
    finalise.reject = reject
  })
  if(activeCommands < thread_limit) {
    activeCommands += 1
    exec(cmd)
      .then(x => {
        activeCommands -= 1
        execNext()
        finalise.resolve(x)
      })
      .catch(finalise.reject)
  } else {
    pendingCommands.push([promise, finalise, cmd])
  }
  return promise
}

async function tryWith(pConstraints, mConstraints, nConstraints) {
  const pArg = pConstraints.map(x => x === null ? '.' : x).join('')
  const mArg = mConstraints.map(xs => xs.length == 0 ? '-' : xs.join('')).join(',')
  const nArg = nConstraints.length > 0 ? nConstraints.join('') : '-'
  const cmd = `${solver} ${pArg} ${mArg} ${nArg}`
  return (await execParallel(cmd)).stdout.trim()
}

async function testWord(word) {
  const pConstraints = Array(5).fill(null)
  const mConstraints = Array(5).fill(null).map(() => [])
  const nConstraints = []
  let result = null
  let score = 0
  let buf = ''
  while(result != word) {
    buf += '\n'
    result = await tryWith(pConstraints, mConstraints, nConstraints)
    if(result.length == 0) {
      console.error(`FAILED: ${word}`)
      return -1
    }
    for(let i=0; i<5; i++) {
      const c1 = result[i]
      const c2 = word[i]
      if(c1 == c2) {
        pConstraints[i] = c1
        for(let j=0; j<5; j++) 
          mConstraints[j] = mConstraints[j].filter(x => x != c1)
        buf += sprintC(c1, 30, 42)
      } else if(word.includes(c1)) {
        mConstraints[i].push(c1)
        buf += sprintC(c1, 94, 103)
      } else {
        nConstraints.push(c1)
        buf += sprintC(c1, 37, 40)
      }
    }
    score++
    if(score > 6) {
      console.error(`TOOSLOW: ${word}`)
      return -2
    }
  }
  if(show_details) console.log(buf)
  console.log(`${score} ${word}`)
  return score
}

const thread_limit =
  process.env['WORDLE_THREADS'] ? Number.parseInt(process.env['WORDLE_THREADS']) :
  Number.parseInt((await exec('getconf _NPROCESSORS_ONLN')).stdout)
if(show_summary)
  console.warn(`Running with ${thread_limit} threads.`)

const scores = Array(6).fill(null).map(() => [])
const giveups = []
const tooslows = []
const startTime = Date.now()
await Promise.all(words.map(async (word,i) => {
  const score = await testWord(word)
  if(score == -1) {
    giveups.push(word)
  } else if(score == -2) {
    tooslows.push(word)
  } else {
    scores[score-1].push(word)
  }
}))
if(show_summary) {
  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  let durationStr = duration < 60 ? `${duration.toFixed(3)}s`
    : duration < 3600 ? `${(duration/60).toFixed(0)}m${(duration%60).toFixed(3)}s`
    : `${(duration/3600).toFixed(0)}h${(duration%3600).toFixed(0)}m${(duration%60).toFixed(3)}s`
  const failed = giveups.length + tooslows.length
  const passScores = scores.map(x => x.length)
  const passed = passScores.reduce((acc,x) => acc + x, 0)
  console.log(`
Finished testing ${dict_file} (${words.length} words) in ${durationStr}.
Passed: ${passed} ${passScores}
Failed: ${failed} (${giveups.length} given up, ${tooslows.length} too slow)
Average: ${passScores.reduce((acc,x,i) => acc + x*(i+1), 0)/passed}
`.trim())
}

