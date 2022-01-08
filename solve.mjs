#!/usr/bin/env node
import {promisify} from 'util'
import {readFile as readFile2} from 'fs'

const readFile = promisify(readFile2)
const DICT_FILE = process.env['WORDLE_LIST'] ?? 'WORDS'
const place_constraints = Array.from(process.argv[2])
const match_constraints = process.argv[3].split(',').map(xs => Array.from(xs).filter(x => x !== '-'))
const neg_constraints = process.argv[4].split('').filter(x => x !== '-')
const ord = c => c.charCodeAt() - 97
const chr = i => 'abcdefghijklmnopqrstuvwxyz'[i]
const dict = (await readFile(DICT_FILE))
  .toString()
  .split('\n')
  .filter(word =>
    match_constraints.every((xs,i) => 
      xs.every(x => word.includes(x) && word[i] !== x)
    ) &&
    !neg_constraints.some(x => word.includes(x)) &&
    place_constraints.every((x,i) => x == '.' ? true : word[i] == x)
  )

const db = (new Array(5)).fill(null).map(() => 'abcdefghijklmnopqrstuvwxyz'.split('').map(x => ({letter: x, count: 0, words: [] })))
const letter_scores = Array.from('abcdefghijklmnopqrstuvwxyz').map(x => dict.filter(w => w.includes(x)).length)
dict.forEach(word => {
  for(let col=0; col<5; col++) {
    let c1 = word[col]
    for(let i=0; i<26; i++) {
      const c2 = chr(i)
      if(c1 === c2) {
        db[col][i].count++
      }
    }
  }
})
const scores = dict
  .map(word => {
    const used_letters = match_constraints.flat().concat(neg_constraints)
    let score = Array.from(word).reduce((acc,c,i) => acc + db[i][ord(c)].count, 0) // letter positon score
    Array.from(word).forEach(x => {
      if(!used_letters.includes(x)) {
        score += letter_scores[ord(x)]
        used_letters.push(x)
      }
    })
    return [word, score]
  }).sort((a,b) => a[1] < b[1] ? 1 : a[1] === b[1] ? 0 : -1)

if(scores.length > 0) 
  console.log(scores[0][0])

