/* eslint-disable functional/functional-parameters */

// Beware that `toEqual` and friends don't play very nicely with sum types as
// they use `Proxy` under the hood, thus we should instead test against
// their serialized forms.

import fc from "fast-check"
import * as Sum from "@unsplash/sum-types"
import {
  getSerializedCodec,
  getCodecFromSerialized,
  getCodec,
} from "../../src/index"
import * as t from "io-ts"
import { flow, pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"

describe("index", () => {
  type S = Sum.Member<"A", number> | Sum.Member<"B"> | Sum.Member<"C", string>
  const {
    mk: { A, B, C },
  } = Sum.create<S>()

  describe("getSerializedCodec", () => {
    const f = getSerializedCodec<S>({
      A: t.number,
      B: t.null,
      C: t.string,
    })

    it("type guards", () => {
      expect(pipe(B(), Sum.serialize, f.is)).toBe(true)

      fc.assert(fc.property(fc.string(), flow(C, Sum.serialize, f.is)))
    })

    it("encodes", () => {
      expect(pipe(B(), Sum.serialize, f.encode)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.string(), x =>
          expect(pipe(x, C, Sum.serialize, f.encode)).toEqual(["C", x]),
        ),
      )
    })

    it("does not decode bad keys", () => {
      expect(pipe(f.decode(["bad key", 123]), E.isLeft)).toBe(true)
    })

    it("does not decode bad values", () => {
      expect(pipe(f.decode(["B", undefined]), E.isLeft)).toBe(true)
      expect(pipe(f.decode(["B", 123]), E.isLeft)).toBe(true)

      expect(pipe(f.decode(["A", "bad val"]), E.isLeft)).toBe(true)
    })

    it("decodes good key/value pairs", () => {
      expect(f.decode(["B", null])).toEqual(E.right(["B", null]))

      fc.assert(
        fc.property(fc.integer(), n =>
          expect(f.decode(["A", n])).toEqual(E.right(["A", n])),
        ),
      )
    })

    // We have to be careful when interacting with `t.union` as it doesn't
    // support fewer than two members
    it("does not break with unary sums", () => {
      type X = Sum.Member<"X", number>
      const {
        mk: { X },
      } = Sum.create<X>()
      const f = getSerializedCodec<X>({ X: t.number })
      const good = ["X", 123] as const
      const badKey = ["bad key", 123] as const
      const badVal = ["X", "bad val"] as const

      expect(f.encode(good)).toEqual(["X", 123])

      expect(f.is(good)).toBe(true)
      expect(f.is(badKey)).toBe(false)
      expect(f.is(badVal)).toBe(false)

      expect(f.decode(good)).toEqual(E.right(good))
      expect(pipe(f.decode(badKey), E.isLeft)).toBe(true)
      expect(pipe(f.decode(badVal), E.isLeft)).toBe(true)
    })
  })

  describe("getCodecFromSerialized", () => {
    const f = getCodecFromSerialized<S>({
      A: t.number,
      B: t.null,
      C: t.string,
    })

    it("type guards", () => {
      expect(pipe(B(), f.is)).toBe(true)

      fc.assert(fc.property(fc.string(), flow(C, f.is)))
    })

    it("encodes", () => {
      expect(pipe(B(), f.encode)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.string(), x =>
          expect(pipe(x, C, f.encode)).toEqual(["C", x]),
        ),
      )
    })

    it("does not decode bad keys", () => {
      const x = Sum.create().mk.Bad(123)
      expect(pipe(f.decode(x), E.isLeft)).toBe(true)
    })

    it("does not decode bad values", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      expect(pipe(f.decode((B as any)(123)), E.isLeft)).toBe(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x = A("bad val" as any)
      expect(pipe(f.decode(x), E.isLeft)).toBe(true)
    })

    it("decodes good key/value pairs", () => {
      const mx = f.decode(pipe(B(), Sum.serialize))
      expect(E.isRight(mx)).toBe(true)
      const x = (mx as E.Right<S>).right
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), n =>
          expect(f.decode(pipe(n, A, Sum.serialize))).toEqual(E.right(A(n))),
        ),
      )
    })
  })

  describe("getCodec", () => {
    const f = getCodec<S>({
      A: t.number,
      B: t.null,
      C: t.string,
    })

    it("type guards", () => {
      expect(pipe(B(), f.is)).toBe(true)

      fc.assert(fc.property(fc.string(), flow(C, f.is)))
    })

    it("encodes", () => {
      const x = f.encode(B())
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.string(), x => expect(f.encode(C(x))).toEqual(C(x))),
      )
    })

    it("does not decode bad keys", () => {
      const x = Sum.create().mk.Bad(123)
      expect(pipe(f.decode(x), E.isLeft)).toBe(true)
    })

    it("does not decode bad values", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      expect(pipe(f.decode((B as any)(123)), E.isLeft)).toBe(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x = A("bad val" as any)
      expect(pipe(f.decode(x), E.isLeft)).toBe(true)
    })

    it("decodes good key/value pairs", () => {
      const mx = f.decode(B())
      expect(E.isRight(mx)).toBe(true)
      const x = (mx as E.Right<S>).right
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), n =>
          expect(f.decode(A(n))).toEqual(E.right(A(n))),
        ),
      )
    })
  })
})
