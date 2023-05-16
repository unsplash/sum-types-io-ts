/* eslint-disable functional/functional-parameters */

import fc from "fast-check"
import * as Sum from "@unsplash/sum-types"
import {
  getSerializedCodec,
  getCodecFromSerialized,
  getCodec,
  getCodecFromMappedNullaryTag,
  getCodecFromPrimitiveMappedNullaryTag,
  getCodecFromNullaryTag,
} from "../../src/index"
import * as t from "io-ts"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { NumberFromString } from "io-ts-types"

describe("index", () => {
  type Nested = Sum.Member<"Nested", number>
  const Nested = Sum.create<Nested>()
  const {
    mk: { Nested: mkNested },
  } = Nested

  type S = Sum.Member<"A", number> | Sum.Member<"B"> | Sum.Member<"C", Nested>
  const S = Sum.create<S>()
  const {
    mk: { A, B, C },
  } = S

  describe("getSerializedCodec", () => {
    const nested = getCodecFromSerialized(Nested)({
      Nested: t.number,
    })
    const f: t.Type<
      readonly ["A", number] | readonly ["B", null] | readonly ["C", Nested],
      | readonly ["A", string]
      | readonly ["B", null]
      | readonly ["C", readonly ["Nested", number]],
      unknown
    > = getSerializedCodec<S>()({
      A: NumberFromString,
      B: t.null,
      C: nested,
    })

    it("type guards", () => {
      expect(pipe(B, Sum.serialize, f.is)).toBe(true)

      fc.assert(
        fc.property(fc.integer(), flow(mkNested, C, Sum.serialize, f.is)),
      )
    })

    it("encodes", () => {
      expect(pipe(B, Sum.serialize, f.encode)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), x =>
          expect(pipe(x, mkNested, C, Sum.serialize, f.encode)).toEqual([
            "C",
            ["Nested", x],
          ]),
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
          expect(f.decode(["A", n.toString()])).toEqual(E.right(["A", n])),
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
      const f = getSerializedCodec<X>()({ X: t.number })
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
    const nested = getCodecFromSerialized(Nested)({
      Nested: t.number,
    })
    const f: t.Type<
      S,
      | readonly ["A", string]
      | readonly ["B", null]
      | readonly ["C", readonly ["Nested", number]],
      unknown
    > = getCodecFromSerialized(S)({
      A: NumberFromString,
      B: t.null,
      C: nested,
    })

    it("type guards", () => {
      expect(pipe(B, f.is)).toBe(true)

      fc.assert(fc.property(fc.integer(), flow(mkNested, C, f.is)))
    })

    it("encodes", () => {
      expect(pipe(B, f.encode)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), x =>
          expect(pipe(x, mkNested, C, f.encode)).toEqual(["C", ["Nested", x]]),
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
      const mx = f.decode(pipe(B, Sum.serialize))
      expect(E.isRight(mx)).toBe(true)
      const x = (mx as E.Right<S>).right
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), n => {
          return expect(f.decode(["A", n.toString()])).toEqual(E.right(A(n)))
        }),
      )
    })
  })

  describe("getCodec", () => {
    const nested = getCodecFromSerialized(Nested)({
      Nested: t.number,
    })
    const f = getCodec(S)({
      A: NumberFromString,
      B: t.null,
      C: nested,
    })

    it("type guards", () => {
      expect(pipe(B, f.is)).toBe(true)

      fc.assert(fc.property(fc.integer(), flow(mkNested, C, f.is)))
    })

    it("encodes", () => {
      const x = f.encode(B)
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), x =>
          expect(f.encode(C(mkNested(x)))).toEqual(
            // Fixed type of constructor `C` expects runtime `Nested`, but it
            // will actually be serialized during encode. This is all typesafe
            // but we're cheating on types here to avoid having to create a new
            // `C` constructor that takes `Serialized<Nested>` instead of just
            // `Nested`.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            C(Sum.serialize(mkNested(x)) as any),
          ),
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
      const mx = f.decode(B)
      expect(E.isRight(mx)).toBe(true)
      const x = (mx as E.Right<S>).right
      expect(Sum.serialize(x)).toEqual(["B", null])

      fc.assert(
        fc.property(fc.integer(), n =>
          expect(f.decode(f.encode(A(n)))).toEqual(E.right(A(n))),
        ),
      )
    })
  })

  describe("getCodecFromMappedNullaryTag", () => {
    type NS = Sum.Member<"NA"> | Sum.Member<"NB">
    const NS = Sum.create<NS>()
    const {
      mk: { NA, NB },
    } = NS
    const c = getCodecFromMappedNullaryTag(NS)(
      x => (x === 1 ? O.some("NA") : x === 2 ? O.some("NB") : O.none),
      x => (x === "NA" ? 1 : 2),
    )(["NA", "NB"])

    it("type guards", () => {
      expect(c.is(NA)).toBe(true)
      expect(c.is("NA")).toBe(false)
      expect(c.is({})).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(NA)).toEqual(1)
      expect(c.encode(NB)).toEqual(2)
    })

    it("does not decode tag, ignoring transformation function", () => {
      expect(pipe(c.decode("NA"), E.isLeft)).toBe(true)
    })

    it("does not decode nonsense", () => {
      expect(pipe(c.decode({}), E.isLeft)).toBe(true)
      expect(pipe(c.decode(["NA", null]), E.isLeft)).toBe(true)
    })

    it("decodes according to transformation function", () => {
      expect(pipe(c.decode(1), E.map(Sum.serialize))).toEqual(
        E.right(["NA", null]),
      )
    })

    it("`is` returns false when getting non sum-types inputs", () => {
      expect(c.is(undefined)).toBe(false)
      expect(c.is({})).toBe(false)
      expect(c.is([])).toBe(false)
      expect(c.is(Symbol("test"))).toBe(false)
      expect(c.is(null)).toBe(false)
    })
  })

  describe("getCodecFromPrimitiveMappedNullaryTag", () => {
    type NS = Sum.Member<"NA"> | Sum.Member<"NB">
    const NS = Sum.create<NS>()
    const {
      mk: { NA, NB },
    } = NS
    const c = getCodecFromPrimitiveMappedNullaryTag(NS)<string | number>({
      NA: "1",
      NB: 2,
    })

    it("Map", () => {
      expect(c.Map).toEqual({ NA: "1", NB: 2 })
    })

    it("type guards", () => {
      expect(c.is(NA)).toBe(true)
      expect(c.is("NA")).toBe(false)
      expect(c.is({})).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(NA)).toEqual("1")
      expect(c.encode(NB)).toEqual(2)
    })

    it("does not decode tag, ignoring transformation function", () => {
      expect(pipe(c.decode("NA"), E.isLeft)).toBe(true)
    })

    it("does not decode nonsense", () => {
      expect(pipe(c.decode({}), E.isLeft)).toBe(true)
      expect(pipe(c.decode(1), E.isLeft)).toBe(true)
      expect(pipe(c.decode("2"), E.isLeft)).toBe(true)
      expect(pipe(c.decode(["NA", null]), E.isLeft)).toBe(true)
    })

    it("decodes according to transformation function", () => {
      expect(pipe(c.decode("1"), E.map(Sum.serialize))).toEqual(
        E.right(["NA", null]),
      )
      expect(pipe(c.decode(2), E.map(Sum.serialize))).toEqual(
        E.right(["NB", null]),
      )
    })
  })

  describe("getCodecFromNullaryTag", () => {
    type NS = Sum.Member<"NA"> | Sum.Member<"NB">
    const NS = Sum.create<NS>()
    const {
      mk: { NA, NB },
    } = NS
    const c = getCodecFromNullaryTag(NS)(["NA", "NB"])

    it("type guards", () => {
      expect(c.is(NA)).toBe(true)
      expect(c.is("NA")).toBe(false)
      expect(c.is({})).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(NA)).toEqual("NA")
      expect(c.encode(NB)).toEqual("NB")
    })

    it("does not decode unknown tag", () => {
      expect(pipe(c.decode("bad"), E.isLeft)).toBe(true)
    })

    it("does not decode nonsense", () => {
      expect(pipe(c.decode({}), E.isLeft)).toBe(true)
      expect(pipe(c.decode(["NA", null]), E.isLeft)).toBe(true)
    })

    it("decodes known tag", () => {
      expect(pipe(c.decode("NA"), E.map(Sum.serialize))).toEqual(
        E.right(["NA", null]),
      )
    })
  })
})
