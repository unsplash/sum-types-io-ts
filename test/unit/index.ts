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
  getUntaggedCodec,
  getExternallyTaggedCodec,
  getAdjacentlyTaggedCodec,
  nullary,
  nullaryFrom,
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

  describe("getUntaggedCodec", () => {
    type T = Sum.Member<"A"> | Sum.Member<"B", number>
    const T = Sum.create<T>()
    const {
      mk: { A, B },
    } = T

    // Typically nullary members would be represented by null or an empty
    // object, but we support anything for which a codec can be provided, so
    // let's test that.
    const c = getUntaggedCodec(T)({
      A: nullaryFrom(false as const)(t.literal(false)),
      B: NumberFromString,
    })

    it("type guards", () => {
      expect(c.is(A)).toBe(true)
      expect(c.is(B(123))).toBe(true)

      expect(c.is("A")).toBe(false)
      expect(c.is("B")).toBe(false)
      expect(c.is({})).toBe(false)
      expect(c.is(false)).toBe(false)
      expect(c.is(123)).toBe(false)
      expect(c.is("123")).toBe(false)
      expect(c.is({ k: 123 })).toBe(false)
      expect(c.is({ k: "123" })).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(A)).toBe(false)
      expect(c.encode(B(123))).toEqual("123")
    })

    it("does not decode bad inputs", () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const f = flow(c.decode, E.isLeft)

      expect(f("A")).toBe(true)
      expect(f("B")).toBe(true)
      expect(f(A)).toBe(true)
      expect(f(B(123))).toBe(true)
      expect(f({})).toBe(true)
      expect(f(true)).toBe(true)
      expect(f(123)).toBe(true)
      expect(f({ x: "123" })).toBe(true)
    })

    it("decodes good inputs", () => {
      expect(c.decode(false)).toEqual(E.right(A))

      fc.assert(
        fc.property(fc.integer({ min: 0 }), n =>
          expect(c.decode(String(n))).toEqual(E.right(B(n))),
        ),
      )
    })

    it("tests codecs in input order", () => {
      type T =
        | Sum.Member<"N1">
        | Sum.Member<"N2">
        | Sum.Member<"U1", number>
        | Sum.Member<"U2", number>
      const T = Sum.create<T>()

      const nc = nullaryFrom(false as const)(t.literal(false))
      const ncs = {
        N1: nc,
        N2: nc,
      }

      const uc = NumberFromString
      const ucs = {
        U1: uc,
        U2: uc,
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const f = flow(getUntaggedCodec(T), x => x.decode)

      expect(f({ N1: nc, N2: nc, ...ucs })(false)).toEqual(E.right(T.mk.N1))
      expect(f({ N2: nc, N1: nc, ...ucs })(false)).toEqual(E.right(T.mk.N2))
      expect(f({ U1: uc, U2: uc, ...ncs })("123")).toEqual(
        E.right(T.mk.U1(123)),
      )
      expect(f({ U2: uc, U1: uc, ...ncs })("123")).toEqual(
        E.right(T.mk.U2(123)),
      )
    })
  })

  describe("getExternallyTaggedCodec", () => {
    type T = Sum.Member<"A"> | Sum.Member<"B", number>
    const T = Sum.create<T>()
    const {
      mk: { A, B },
    } = T

    // Typically nullary members would be represented by null or an empty
    // object, but we support anything for which a codec can be provided, so
    // let's test that.
    const c = getExternallyTaggedCodec(T)({
      A: nullaryFrom(false as const)(t.literal(false)),
      B: NumberFromString,
    })

    it("type guards", () => {
      expect(c.is(A)).toBe(true)
      expect(c.is(B(123))).toBe(true)

      expect(c.is("A")).toBe(false)
      expect(c.is("B")).toBe(false)
      expect(c.is({})).toBe(false)
      expect(c.is(false)).toBe(false)
      expect(c.is(123)).toBe(false)
      expect(c.is("123")).toBe(false)
      expect(c.is({ k: 123 })).toBe(false)
      expect(c.is({ k: "123" })).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(A)).toEqual({ A: false })
      expect(c.encode(B(123))).toEqual({ B: "123" })
    })

    it("does not decode bad inputs", () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const f = flow(c.decode, E.isLeft)

      expect(f("A")).toBe(true)
      expect(f("B")).toBe(true)
      expect(f(A)).toBe(true)
      expect(f(B(123))).toBe(true)
      expect(f({})).toBe(true)
      expect(f(false)).toBe(true)
      expect(f("123")).toBe(true)
    })

    it("decodes good inputs", () => {
      expect(c.decode({ A: false })).toEqual(E.right(A))

      fc.assert(
        fc.property(fc.integer({ min: 0 }), n =>
          expect(c.decode({ B: String(n) })).toEqual(E.right(B(n))),
        ),
      )
    })

    it("requires key to be present even if nullary", () => {
      type T = Sum.Member<"A">
      const T = Sum.create<T>()
      const c = getExternallyTaggedCodec(T)({ A: nullary })

      expect(E.isLeft(c.decode({}))).toBe(true)
    })

    it("tests codecs in input order", () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const f = flow(getExternallyTaggedCodec(T), x => x.decode)

      const a = nullaryFrom(false as const)(t.literal(false))
      const b = NumberFromString

      const both = { A: false, B: "123" }

      expect(f({ A: a, B: b })(both)).toEqual(E.right(T.mk.A))
      expect(f({ B: b, A: a })(both)).toEqual(E.right(T.mk.B(123)))
    })
  })

  describe("getAdjacentlyTaggedCodec", () => {
    type T = Sum.Member<"A"> | Sum.Member<"B", number>
    const T = Sum.create<T>()
    const {
      mk: { A, B },
    } = T

    // Typically nullary members would be represented by null or an empty
    // object, but we support anything for which a codec can be provided, so
    // let's test that.
    const c = getAdjacentlyTaggedCodec("tag")("value")(T)({
      A: nullaryFrom(false as const)(t.literal(false)),
      B: NumberFromString,
    })

    it("type guards", () => {
      expect(c.is(A)).toBe(true)
      expect(c.is(B(123))).toBe(true)

      expect(c.is("A")).toBe(false)
      expect(c.is("B")).toBe(false)
      expect(c.is({})).toBe(false)
      expect(c.is(false)).toBe(false)
      expect(c.is(123)).toBe(false)
      expect(c.is("123")).toBe(false)
      expect(c.is({ tag: "B", value: "123" })).toBe(false)
    })

    it("encodes", () => {
      expect(c.encode(A)).toEqual({ tag: "A", value: false })
      expect(c.encode(B(123))).toEqual({ tag: "B", value: "123" })
    })

    it("does not decode bad inputs", () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const f = flow(c.decode, E.isLeft)

      expect(f("A")).toBe(true)
      expect(f("B")).toBe(true)
      expect(f(A)).toBe(true)
      expect(f(B(123))).toBe(true)
      expect(f({})).toBe(true)
      expect(f(false)).toBe(true)
      expect(f("123")).toBe(true)
      expect(f({ tag: "A", value: "123" })).toBe(true)
      expect(f({ tag: "B", value: 123 })).toBe(true)
    })

    it("decodes good inputs", () => {
      expect(c.decode({ tag: "A", value: false })).toEqual(E.right(A))

      fc.assert(
        fc.property(fc.integer({ min: 0 }), n =>
          expect(c.decode({ tag: "B", value: String(n) })).toEqual(
            E.right(B(n)),
          ),
        ),
      )
    })

    // This is partially for documentative purposes.
    it("handles different nullary encodings", () => {
      type T = Sum.Member<"A">
      const T = Sum.create<T>()
      const c = getAdjacentlyTaggedCodec("tag")("value")(T)

      const cn = c({ A: t.null })
      expect(cn.decode({ tag: "A", value: null })).toEqual(E.right(T.mk.A))
      expect(cn.decode({ tag: "A" })).not.toEqual(E.right(T.mk.A))
      expect(cn.encode(T.mk.A)).toEqual({ tag: "A", value: null })

      const cu = c({ A: nullary })
      expect(
        cu.decode({
          tag: "A",
          value: undefined,
        }),
      ).toEqual(E.right(T.mk.A))
      expect(cu.decode({ tag: "A" })).toEqual(E.right(T.mk.A))
      expect(cu.encode(T.mk.A)).not.toStrictEqual({ tag: "A" })
      expect(cu.encode(T.mk.A)).toStrictEqual({ tag: "A", value: undefined })
    })

    it("interops with fp-ts encodings", () => {
      type Maybe<A> = Sum.Member<"Some", A> | Sum.Member<"None">
      const MaybeNum = Sum.create<Maybe<number>>()
      const c = getAdjacentlyTaggedCodec("_tag")("value")(MaybeNum)({
        Some: t.number,
        None: nullary,
      })

      expect(c.decode(O.some(123))).toEqual(E.right(MaybeNum.mk.Some(123)))
      expect(c.decode(O.none)).toEqual(E.right(MaybeNum.mk.None))
    })
  })
})
