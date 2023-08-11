/* eslint-disable functional/functional-parameters, functional/no-expression-statement, @typescript-eslint/no-unused-vars */

import * as Sum from "@unsplash/sum-types"
import {
  getCodecFromSerialized,
  getCodecFromMappedNullaryTag,
  getCodecFromNullaryTag,
  getUntaggedCodec,
  getInternallyTaggedCodec,
  getExternallyTaggedCodec,
  getAdjacentlyTaggedCodec,
  nullaryFromEmpty,
} from "../../src/index"
import * as t from "io-ts"
import { constant } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { NumberFromString } from "io-ts-types"

type A = Sum.Member<"A1"> | Sum.Member<"A2", number>
const A = Sum.create<A>()

getCodecFromSerialized(A)({ A1: t.null, A2: t.number }) // $ExpectType Type<A, readonly ["A1", null] | readonly ["A2", number], unknown>
getCodecFromSerialized(A)({ A1: t.string, A2: t.number }) // $ExpectError
getCodecFromSerialized(A)({ A1: t.undefined, A2: t.number }) // $ExpectError
getCodecFromSerialized(A)({ A2: t.number }) // $ExpectError
getCodecFromSerialized(A)({ A1: t.null }) // $ExpectError

type B = Sum.Member<"B1"> | Sum.Member<"B2">
const B = Sum.create<B>()

const getCodecFromMappedNullaryTagPA = getCodecFromMappedNullaryTag(B)(
  (i: "foo") => O.none,
  constant("foo"),
)
getCodecFromMappedNullaryTagPA([]) // $ExpectError
getCodecFromMappedNullaryTagPA(["B1"]) // $ExpectError
getCodecFromMappedNullaryTagPA(["B2"]) // $ExpectError
getCodecFromMappedNullaryTagPA(["B1", "B1"]) // $ExpectError
getCodecFromMappedNullaryTagPA(["B1", "B2"]) // $ExpectType Type<B, string, "foo">

getCodecFromNullaryTag(B)([]) // $ExpectError
getCodecFromNullaryTag(B)(["B1"]) // $ExpectError
getCodecFromNullaryTag(B)(["B2"]) // $ExpectError
getCodecFromNullaryTag(B)(["B1", "B1"]) // $ExpectError
getCodecFromNullaryTag(B)(["B1", "B2"]) // $ExpectType Type<B, string, unknown>

type C = Sum.Member<"C1"> | Sum.Member<"C2", { readonly k: number }>
const C = Sum.create<C>()

const c1 = nullaryFromEmpty
const c2 = t.strict({ k: NumberFromString })

getUntaggedCodec(C)({ C2: c2, C1: c1 }) // $ExpectType Type<C, Record<string, unknown> | { k: string; } | null | undefined, unknown>
getUntaggedCodec(C)({ C1: c1 }) // $ExpectError
getUntaggedCodec(C)({ C2: c2 }) // $ExpectError

getInternallyTaggedCodec("tag")(C)({ C2: c2, C1: c1 }) // $ExpectType Type<C, (Record<"tag", "C1"> & Record<string, unknown>) | (Record<"tag", "C2"> & { k: string; }), unknown>
getInternallyTaggedCodec("tag")(C)({ C1: c1 }) // $ExpectError
getInternallyTaggedCodec("tag")(C)({ C2: c2 }) // $ExpectError

getExternallyTaggedCodec(C)({ C2: c2, C1: c1 }) // $ExpectType Type<C, Record<"C1", Record<string, unknown> | null | undefined> | Record<"C2", { k: string; }>, unknown>
getExternallyTaggedCodec(C)({ C1: c1 }) // $ExpectError
getExternallyTaggedCodec(C)({ C2: c2 }) // $ExpectError

getAdjacentlyTaggedCodec("tag")("val")(C)({ C2: c2, C1: c1 }) // $ExpectType Type<C, (Record<"tag", "C1"> & Record<"val", Record<string, unknown> | null | undefined>) | (Record<"tag", "C2"> & Record<"val", { k: string; }>), unknown>
getAdjacentlyTaggedCodec("tag")("val")(C)({ C1: c1 }) // $ExpectError
getAdjacentlyTaggedCodec("tag")("val")(C)({ C2: c2 }) // $ExpectError
