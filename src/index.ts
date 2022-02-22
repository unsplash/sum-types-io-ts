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
import { Refinement } from "fp-ts/Refinement"

// We must add the `any` type argument or it won't distribute over unions for
// some reason.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Tag<A> = A extends Sum.Member<infer B, any> ? B : never
type Value<A> = A extends Sum.Member<any, infer B> ? B : never
/* eslint-enable @typescript-eslint/no-explicit-any */

type NullaryMember = Sum.Member<string>

/**
 * An object from member tags to codecs of their values.
 *
 * We require codecs for members without values as well as we need all the keys
 * to be present at runtime, and taking `t.null` is more consistent and less
 * magical than any alternative.
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
): t.Type<Sum.Serialized<A>> =>
  pipe(
    toArray(cs) as Array<[Tag<A>, t.Type<Value<A>>]>,
    A.map(flow(mapFst(t.literal), xs => t.tuple(xs))),
    ([x, y, ...zs]) => (y === undefined ? x : t.union([x, y, ...zs], name)),
  ) as unknown as t.Type<Sum.Serialized<A>>

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding to/from `Serialized<A>`.
 *
 * @since 0.1.0
 */
export const getCodecFromSerialized = <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name = "Sum",
): t.Type<A, Sum.Serialized<A>> => {
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
    flow(Sum.serialize, x => sc.encode(x)),
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
          () => t.failure<Sum.Serialized<A>>(x, ctx),
          y => t.success(y),
        ),
        E.chain(y => sc.validate(y, ctx)),
        E.map(constant(x as A)),
      ),
    t.identity,
  )
}

/**
 * Ensures that every key in union `A` is present at least once in array `B`.
 *
 * @link https://github.com/Microsoft/TypeScript/issues/13298#issuecomment-468733257
 */
type EveryKeyPresent<A, B> = Array<A> extends B
  ? B extends Array<A>
    ? B
    : never
  : never

/**
 * Derive a codec for any given sum `A` in which all the constructors are
 * nullary, decoding and encoding to/from the constructor tags.
 *
 * @since 0.3.0
 */
export const getCodecFromNullaryTag =
  <A extends NullaryMember>() =>
  <B>(
    tags: EveryKeyPresent<Tag<A>, B>,
    name = "Sum Tag",
  ): t.Type<A, string> => {
    const isKnownTag: Refinement<unknown, Tag<A>> = (x): x is Tag<A> =>
      tags.includes(x as Tag<A>)

    return new t.Type(
      name,
      (x): x is A =>
        pipe(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          O.tryCatch(() => Sum.serialize<A>(x as any)),
          O.match(constant(false), y => isKnownTag(y[0]) && y[1] === null),
        ),
      (x, ctx) =>
        isKnownTag(x)
          ? t.success(
              Sum.deserialize<A>()([x, null] as unknown as Sum.Serialized<A>),
            )
          : t.failure(x, ctx),
      flow(Sum.serialize, x => x[0]),
    )
  }
