/**
 * @since 0.1.0
 */

/* eslint-disable functional/functional-parameters, functional/prefer-readonly-type, @typescript-eslint/unbound-method */

import * as Sum from "@unsplash/sum-types"
import { flow, pipe } from "fp-ts/function"
import * as t from "io-ts"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import * as Map from "fp-ts/Map"
import * as R from "fp-ts/Record"
import * as Str from "fp-ts/string"
import { mapFst } from "fp-ts/Tuple"
import { Refinement } from "fp-ts/Refinement"
import { eqStrict } from "fp-ts/Eq"

// We must add the `any` type argument or it won't distribute over unions for
// some reason.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Tag<A> = A extends Sum.Member<infer B, any> ? B : never
type Value<A> = A extends Sum.Member<any, infer B> ? B : never
/* eslint-enable @typescript-eslint/no-explicit-any */

type NullaryMember = Sum.Member<string>

type Primitive = string | number | boolean | bigint | undefined | null

/**
 * An object from member tags to codecs of their values.
 *
 * We require codecs for members without values as well as we need all the keys
 * to be present at runtime, and taking `t.null` is more consistent and less
 * magical than any alternative.
 */
type MemberCodecs<A extends Sum.AnyMember> = {
  readonly [B in A as Tag<B>]: t.Type<Value<B>, unknown>
}

type OutputsOf<
  A extends Sum.AnyMember,
  B extends MemberCodecs<A>,
> = A extends Sum.AnyMember
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Sum.Member<Tag<A>, B[Tag<A>] extends t.Type<any, infer C> ? C : never>
  : never

const unknownSerialize = (
  x: unknown,
): O.Option<readonly [unknown, unknown]> => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
  return O.tryCatch(() => Sum.serialize(x as any))
}

/**
 * Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
 * all its members` values.
 *
 * @since 0.1.0
 */
export const getSerializedCodec =
  <A extends Sum.AnyMember>() =>
  <B extends MemberCodecs<A>>(
    cs: B,
    name = "Serialized Sum",
  ): t.Type<Sum.Serialized<A>, Sum.Serialized<OutputsOf<A, B>>> =>
    pipe(
      R.toArray(cs),
      A.map(flow(mapFst(t.literal), xs => t.tuple(xs))),
      ([x, y, ...zs]) => (y === undefined ? x : t.union([x, y, ...zs], name)),
    ) as unknown as t.Type<Sum.Serialized<A>, Sum.Serialized<OutputsOf<A, B>>>

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding to/from `Serialized<A>`.
 *
 * @since 0.1.0
 */
export const getCodecFromSerialized =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <B extends MemberCodecs<A>>(
    cs: B,
    name = "Sum",
  ): t.Type<A, Sum.Serialized<OutputsOf<A, B>>> => {
    const sc = getSerializedCodec<A>()(cs, name)

    return new t.Type(
      name,
      (x): x is A => pipe(unknownSerialize(x), O.exists(sc.is)),
      flow(sc.validate, E.map(Sum.deserialize(sum))),
      flow(Sum.serialize, sc.encode),
    )
  }

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values.
 *
 * @since 0.1.0
 */
export const getCodec =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <B extends MemberCodecs<A>>(
    cs: B,
    name = "Sum",
  ): t.Type<A, OutputsOf<A, B>> => {
    const sc = getSerializedCodec<A>()(cs, name)

    return new t.Type(
      name,
      (x): x is A => pipe(unknownSerialize(x), O.exists(sc.is)),
      (i, c) =>
        pipe(
          i,
          unknownSerialize,
          O.matchW(() => t.failure(i, c), E.right),
          E.chain(sc.decode),
          E.map(Sum.deserialize(sum)),
        ),
      flow(
        Sum.serialize,
        sc.encode,
        Sum.deserialize(sum as unknown as Sum.Sum<OutputsOf<A, B>>),
      ),
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
 * functions. Consider instead `getCodecFromPrimitiveMappedNullaryTag` for
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
 *   getCodecFromMappedNullaryTag(Weather)<Country, unknown>(
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
 * assert.deepStrictEqual(WeatherFromCountry.decode("UK"), E.right(Weather.mk.Rain))
 *
 * @since 0.3.0
 */
export const getCodecFromMappedNullaryTag =
  <A extends NullaryMember>(sum: Sum.Sum<A>) =>
  <O, I>(from: (x: I) => O.Option<Tag<A>>, to: (x: Tag<A>) => O) =>
  <C>(
    tags: EveryKeyPresent<Tag<A>, C>,
    name = "Sum Mapped Tag",
  ): t.Type<A, O, I> => {
    const isKnownTag: Refinement<unknown, Tag<A>> = (x): x is Tag<A> =>
      tags.includes(x as Tag<A>)

    return new t.Type(
      name,
      (x): x is A =>
        pipe(
          unknownSerialize(x),
          O.exists(y => isKnownTag(y[0]) && y[1] === null),
        ),
      (x, ctx) =>
        pipe(
          x,
          from,
          O.match(
            () => t.failure(x, ctx),
            k =>
              t.success(
                Sum.deserialize(sum)([k, null] as unknown as Sum.Serialized<A>),
              ),
          ),
        ),
      flow(Sum.serialize, x => x[0] as Tag<A>, to),
    )
  }

/**
 * @since 0.5.1
 */
export class MappedType<A, B> extends t.Type<A, B, unknown> {
  /**
   * @since 0.5.1
   */
  readonly _tag: "@unsplash/sum-types-io-ts/MappedType" =
    "@unsplash/sum-types-io-ts/MappedType"
  constructor(
    name: string,
    is: MappedType<A, B>["is"],
    validate: MappedType<A, B>["validate"],
    encode: MappedType<A, B>["encode"],
    readonly Map: Record<Tag<A>, B>,
  ) {
    super(name, is, validate, encode)
  }
}

/**
 * A convenient alternative to `getCodecFromMappedNullaryTag` for working with
 * for example stringly APIs. The behaviour is unspecified if the input `Record`
 * contains duplicate values.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { getCodecFromPrimitiveMappedNullaryTag } from "@unsplash/sum-types-io-ts"
 * import * as O from "fp-ts/Option"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain">
 * const Weather = Sum.create<Weather>()
 * type Country = "UK" | "Italy"
 *
 * const WeatherFromCountry: t.Type<Weather, Country> =
 *   getCodecFromPrimitiveMappedNullaryTag(Weather)({ Sun: "Italy", Rain: "UK" })
 *
 * assert.deepStrictEqual(WeatherFromCountry.decode("UK"), E.right(Weather.mk.Rain))
 *
 * @since 0.5.0
 **/
export const getCodecFromPrimitiveMappedNullaryTag =
  <A extends NullaryMember>(sum: Sum.Sum<A>) =>
  <B extends Primitive>(
    tos: Record<Tag<A>, B>,
    name = "Sum Primitive Mapped Tag",
  ): MappedType<A, B> => {
    const froms: Map<B, Tag<A>> = pipe(
      tos,
      R.reduceWithIndex(Str.Ord)(new globalThis.Map<B, Tag<A>>(), (k, xs, v) =>
        Map.upsertAt<B>(eqStrict)(v, k)(xs),
      ),
    )

    const codec = getCodecFromMappedNullaryTag(sum)(
      x => Map.lookup(eqStrict)(x)(froms),
      x => tos[x],
    )(Object.keys(tos) as Array<Tag<A>>, name)

    return new MappedType(
      codec.name,
      codec.is,
      codec.validate,
      codec.encode,
      tos,
    )
  }

/**
 * Derive a codec for any given sum `A` in which all the constructors are
 * nullary, decoding and encoding to/from the constructor tags.
 *
 * @since 0.3.0
 */
export const getCodecFromNullaryTag =
  <A extends NullaryMember>(sum: Sum.Sum<A>) =>
  <B>(tags: EveryKeyPresent<Tag<A>, B>, name = "Sum Tag"): t.Type<A, string> =>
    getCodecFromPrimitiveMappedNullaryTag(sum)(
      pipe(
        tags,
        A.reduce({} as Record<Tag<A>, string>, (xs, y) =>
          R.upsertAt(y, y as string)(xs),
        ),
      ),
      name,
    )

// import * as t from "io-ts"
// import * as Sum from "@unsplash/sum-types"
// import { getCodecFromMappedNullaryTag } from "@unsplash/sum-types-io-ts"
// import * as O from "fp-ts/Option"
// import * as E from "fp-ts/Either"

// type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain">
// const Weather = Sum.create<Weather>()
// const Country = t.union([
//   t.literal("UK"),
//   t.literal("Italy"),
//   t.literal("Spain"),
// ])
// type Country = t.TypeOf<typeof Country>
// const WeatherFromCountry: t.Type<Weather, Country, Country> =
//   getCodecFromMappedNullaryTag(Weather)<Country, Country>(
//     x => {
//       // eslint-disable-next-line functional/no-conditional-statement
//       switch (x) {
//         // This will error because it's not a valid country.
//         case "France":
//           return O.some("Sun")
//         case "Italy":
//           return O.some("Sun")
//         case "UK":
//           return O.some("Rain")
//         case 'Spain':
//           return O.none
//       }
//     },
//     x => (x === "Sun" ? "Italy" : "UK"),
//   )(["Sun", "Rain"])
// const WeatherFromCountryFromUnknown: t.Type<Weather, Country, unknown> =
//   Country.pipe(WeatherFromCountry)

// assert.deepStrictEqual(WeatherFromCountry.decode("UK"), E.right(Weather.mk.Rain))
