/* eslint-disable functional/functional-parameters, functional/no-expression-statement, @typescript-eslint/no-unused-vars */

import * as Sum from "@unsplash/sum-types"
import {
  getCodecFromSerialized,
  getCodecFromMappedNullaryTag,
  getCodecFromNullaryTag,
} from "../../src/index"
import * as t from "io-ts"
import { constant } from "fp-ts/function"
import * as O from "fp-ts/Option"

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
