/* eslint-disable functional/functional-parameters, functional/no-expression-statement, @typescript-eslint/no-unused-vars */

import * as Sum from "@unsplash/sum-types"
import { getCodecFromSerialized } from "../../src/index"
import * as t from "io-ts"

type A = Sum.Member<"A1"> | Sum.Member<"A2", number>

getCodecFromSerialized<A>({ A1: t.undefined, A2: t.number }) // $ExpectType Type<A, readonly ["A1", undefined] | readonly ["A2", number], unknown>
getCodecFromSerialized<A>({ A1: t.string, A2: t.number }) // $ExpectError
getCodecFromSerialized<A>({ A2: t.number }) // $ExpectError
getCodecFromSerialized<A>({ A1: t.undefined }) // $ExpectError
