"use strict";

/*
  ABSOLUTE KERNEL
  Reality = Execution under Constraint
  No external observers
  No unbounded execution
  Fully replayable
*/

class AbsoluteKernel {
  constructor({
    maxUnits = 1_000,
    maxDepth = 32,
    pulseSize = 1,
    seed = 0
  } = {}) {
    this.constraints = Object.freeze({
      maxUnits,
      maxDepth,
      pulseSize
    });

    this.clock = 0;
    this.unitsUsed = 0;

    this.density = new Map();        // D: state density
    this.relations = new Set();      // ΔD: relational differences
    this.history = [];               // replayable execution trace

    this.random = this._rng(seed);   // deterministic excitation
  }

  /* ----------------------------
     Deterministic RNG
     ---------------------------- */
  _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------
     Density (State)
     ---------------------------- */
  defineState(id, value) {
    this._consume(1);
    this.density.set(id, value);
    this._record("define", { id, value });
  }

  getState(id) {
    return this.density.get(id);
  }

  /* ----------------------------
     Relational Difference
     ---------------------------- */
  relate(a, b, fn) {
    this._consume(1);
    const relation = { a, b, fn };
    this.relations.add(relation);
    this._record("relate", { a, b });
  }

  /* ----------------------------
     Excitation (State Transition)
     ---------------------------- */
  excite(depth = 0) {
    if (depth > this.constraints.maxDepth) return;

    for (let i = 0; i < this.constraints.pulseSize; i++) {
      this._consume(1);

      for (const { a, b, fn } of this.relations) {
        const va = this.density.get(a);
        const vb = this.density.get(b);

        if (va === undefined || vb === undefined) continue;

        const next = fn(va, vb, this.random);

        if (next !== undefined) {
          this.density.set(a, next);
          this._record("excite", { a, from: va, to: next });
        }
      }
    }

    this.clock++;
  }

  /* ----------------------------
     Observer Inclusion
     ---------------------------- */
  observe() {
    this._consume(1);
    const snapshot = Object.fromEntries(this.density);
    this._record("observe", snapshot);
    return snapshot;
  }

  /* ----------------------------
     Replayability
     ---------------------------- */
  replay() {
    return JSON.parse(JSON.stringify(this.history));
  }

  /* ----------------------------
     Constraint Enforcement
     ---------------------------- */
  _consume(units) {
    this.unitsUsed += units;
    if (this.unitsUsed > this.constraints.maxUnits) {
      throw new Error("Execution constraint violated: maxUnits exceeded");
    }
  }

  _record(type, payload) {
    this.history.push({
      t: this.clock,
      type,
      payload
    });
  }
}

const kernel = new AbsoluteKernel({
  maxUnits: 200,
  pulseSize: 1,
  seed: 42
});

// Density
kernel.defineState("A", 1);
kernel.defineState("B", 2);

// Relational difference → excitation
kernel.relate("A", "B", (a, b, rng) => {
  // constrained, deterministic transition
  if (rng() > 0.5) return a + b;
});

// Execute
kernel.excite();
kernel.excite();

// Observer is internal
console.log("Observation:", kernel.observe());

// Replayable truth
console.log("History:", kernel.replay());
