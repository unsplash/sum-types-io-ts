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
import * as R from "fp-ts/Record"
import * as Str from "fp-ts/string"
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
    R.toArray(cs) as Array<[Tag<A>, t.Type<Value<A>>]>,
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
 * nullary, decoding and encoding to/from the constructor tags via conversion
 * functions. Consider instead `getCodecFromStringlyMappedNullaryTag` for
 * stringly APIs.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { getCodecFromMappedNullaryTag } from "@unsplash/sum-types-io-ts"
 * import * as O from "fp-ts/Option"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain">
 * const Weather = Sum.create<Weather>()
 * type Country = "UK" | "Italy"
 *
 * const WeatherFromCountry: t.Type<Weather, Country> =
 *   getCodecFromMappedNullaryTag<Weather>()<Country>(
 *     x => {
 *       switch (x) {
 *         case "Italy":
 *           return O.some("Sun")
 *         case "UK":
 *           return O.some("Rain")
 *         default:
 *           return O.none
 *       }
 *     },
 *     x => (x === "Sun" ? "Italy" : "UK"),
 *   )(["Sun", "Rain"])
 *
 * assert.deepStrictEqual(WeatherFromCountry.decode("UK"), E.right(Weather.mk.Rain()))
 *
 * @since 0.3.0
 */
export const getCodecFromMappedNullaryTag =
  <A extends NullaryMember>() =>
  <B>(from: (x: unknown) => O.Option<Tag<A>>, to: (x: Tag<A>) => B) =>
  <C>(
    tags: EveryKeyPresent<Tag<A>, C>,
    name = "Sum Mapped Tag",
  ): t.Type<A, B> => {
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
        pipe(
          x,
          from,
          O.match(
            () => t.failure(x, ctx),
            k =>
              t.success(
                Sum.deserialize<A>()([k, null] as unknown as Sum.Serialized<A>),
              ),
          ),
        ),
      flow(Sum.serialize, x => x[0] as Tag<A>, to),
    )
  }

/**
 * A convenient alternative to `getCodecFromMappedNullaryTag` for working with
 * stringly APIs. The behaviour is unspecified if the input `Record` contains
 * duplicate values.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { getCodecFromStringlyMappedNullaryTag } from "@unsplash/sum-types-io-ts"
 * import * as O from "fp-ts/Option"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain">
 * const Weather = Sum.create<Weather>()
 * type Country = "UK" | "Italy"
 *
 * const WeatherFromCountry: t.Type<Weather, Country> =
 *   getCodecFromStringlyMappedNullaryTag<Weather>()({ Sun: "Italy", Rain: "UK" })
 *
 * assert.deepStrictEqual(WeatherFromCountry.decode("UK"), E.right(Weather.mk.Rain()))
 *
 * @since 0.3.0
 **/
export const getCodecFromStringlyMappedNullaryTag =
  <A extends NullaryMember>() =>
  <B extends string>(
    tos: Record<Tag<A>, B>,
    name = "Sum Stringly Mapped Tag",
  ): t.Type<A, B> => {
    const froms = pipe(
      tos,
      R.reduceWithIndex(Str.Ord)({} as Record<B, Tag<A>>, (k, xs, v) =>
        R.upsertAt(v, k)(xs),
      ),
    )

    return getCodecFromMappedNullaryTag<A>()(
      x => (typeof x === "string" ? R.lookup(x)(froms) : O.none),
      x => tos[x],
    )(Object.keys(tos) as Array<Tag<A>>, name)
  }

/**
 * Derive a codec for any given sum `A` in which all the constructors are
 * nullary, decoding and encoding to/from the constructor tags.
 *
 * @since 0.3.0
 */
export const getCodecFromNullaryTag =
  <A extends NullaryMember>() =>
  <B>(tags: EveryKeyPresent<Tag<A>, B>, name = "Sum Tag"): t.Type<A, string> =>
    getCodecFromStringlyMappedNullaryTag<A>()(
      pipe(
        tags,
        A.reduce({} as Record<Tag<A>, string>, (xs, y) =>
          R.upsertAt(y, y as string)(xs),
        ),
      ),
      name,
    )
