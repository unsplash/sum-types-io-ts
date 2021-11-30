/**
 * @since 0.1.0
 */

/* eslint-disable functional/functional-parameters, functional/prefer-readonly-type */

import * as Sum from "@unsplash/sum-types"
import { constant, flow, pipe } from "fp-ts/function"
import * as t from "io-ts"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { toArray } from "fp-ts/Record"
import { mapFst } from "fp-ts/Tuple"

// We must add the `any` type argument or it won't distribute over unions for
// some reason.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Tag<A> = A extends Sum.Member<infer B, any> ? B : never
type Value<A> = A extends Sum.Member<any, infer B> ? B : never
/* eslint-enable @typescript-eslint/no-explicit-any */

type Serialized<A> = A extends Sum.AnyMember
  ? readonly [Tag<A>, Value<A>]
  : never

/**
 * An object from member tags to codecs of their values.
 *
 * We require codecs for members without values as well as we need all the keys
 * to be present at runtime, and taking `t.undefined` is more consistent and
 * less magical than any alternative.
 */
type MemberCodecs<A extends Sum.AnyMember> = {
  readonly [B in A as Tag<B>]: t.Type<Value<B>>
}

/**
 * Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
 * all its members` values.
 *
 * @since 0.1.0
 */
export const getSerializedCodec = <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name = "Serialized Sum",
): t.Type<Serialized<A>> =>
  pipe(
    toArray(cs) as Array<[Tag<A>, t.Type<Value<A>>]>,
    A.map(flow(mapFst(t.literal), xs => t.tuple(xs))),
    ([x, y, ...zs]) => (y === undefined ? x : t.union([x, y, ...zs], name)),
  ) as unknown as t.Type<Serialized<A>>

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding to/from `Serialized<A>`.
 *
 * @since 0.1.0
 */
export const getCodecFromSerialized = <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name = "Sum",
): t.Type<A, Serialized<A>> => {
  const sc = getSerializedCodec(cs, name)

  return new t.Type(
    name,
    (x): x is A =>
      pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        O.tryCatch(() => Sum.serialize<A>(x as any)),
        O.match(constant(false), sc.is),
      ),
    flow(sc.validate, E.map(Sum.deserialize<A>())),
    flow(Sum.serialize, x => sc.encode(x as Serialized<A>)),
  )
}

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values.
 *
 * @since 0.1.0
 */
export const getCodec = <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name = "Sum",
): t.Type<A> => {
  const sc = getSerializedCodec(cs, name)

  return new t.Type(
    name,
    (x): x is A =>
      pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        O.tryCatch(() => Sum.serialize<A>(x as any)),
        O.match(constant(false), sc.is),
      ),
    (x, ctx) =>
      pipe(
        O.tryCatch(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Sum.serialize(x as any as A),
        ),
        O.match(
          () => t.failure<Serialized<A>>(x, ctx),
          y => t.success(y as Serialized<A>),
        ),
        E.chain(y => sc.validate(y, ctx)),
        E.map(constant(x as A)),
      ),
    t.identity,
  )
}
