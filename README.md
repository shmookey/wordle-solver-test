Wordle Solver Testbench
=======================

This test bench measures the performance of a solver for the Wordle puzzle game. It can also aid in debugging and optimizing solvers, by showing how it approaches solving a particular word.  

For every word in an input list, it runs the solver one or more times. The solver is a command-line program which prints a suggested next word based on information obtained from prior invocations, which is supplied as arguments. The test bench records a score for each word, corresponding to how many times the solver is run before generating the correct answer. Words which do not lead to a successful outcome within 6 rounds are marked as failures. At the end, the test bench prints the solver's average score, failure count and a number of other statistics.

![details view](https://shmookey.github.io/wordle-solver-test/details-mode.png)
![summary view](https://shmookey.github.io/wordle-solver-test/summary-mode.png)

### Synopsis

```
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
```


### Solvers

Solvers are command-line programs. The output of a solver to stdout must be either a 5 letter word, or empty. If there is no output, the solver gives up on the current word and it is marked as a failure. If the output is a word, it is checked for correctness in the same manner as a word entered into Wordle interactively. Any information gleaned is stored in a constraint set, which is passed back to the solver in the next invocation. The constraints are given as three arguments:

  - *place constraints* indicate letters known to be at a specific location within a word. It is specified in the form of a word, with dots in the place of unknown characters. For example, if we know the first two letters of the word are 'PA', the place constraints argument would be 'PA...'.
  - *match constraints* indicate letters known to be within a word, but not at a particular location (or locations). Like place constraints, we need to specify what we know for each position, but with match constraints we can know that more than one letter occurs *not* at that position. For match constraints, then, we use groups of letters separated by commas, optionally with a hyphen for an empty group. If we know that the word contains an 'A' and an 'E', but neither of them are at the 4th position, we could write the match constraints as '-,-,-,AE,-'.
 - *negative constraints* indicate letters known to not occur in the word. These are simply given as a group of letters. If we know that 'X', 'Y' and 'Z' are all absent, we could write the negative constraints as 'XYZ'.

Example of running a solver:

```
$ solve ..... -,-,-,-,- -
tares
$ solve ..... -,a,-,e,- trs
blade
$ solve ..a.e -,l,-,-,- trsbd
whale
```

If a solver uses a word list file, the environment variable `WORDLE_LIST` should contain the word list it uses. Ideally, the solver should use this variable to determine which file to load, so that it always loads the same word list as the test bench. Otherwise, the test bench may use words that the solver will never even try. A solver's performance is demonstrated most clearly when the set of words it could solve exactly matches the set of words it will be tested on. Its average score then represents the overall speed with which it solves words in that set.


### Installing

As the testbench is a single file of standalone JavaScript, you don't need to install it, as long as you have a relatively recent version of node installed it should just work if invoked directly. Here's how you can run the provided reference solver:

```
$ git clone https://github.com/shmookey/wordle-solver-test
$ cd world-solver-test
$ ./wstest.mjs ./solve.mjs
```


