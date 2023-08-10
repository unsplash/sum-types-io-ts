/**
 * @since 0.1.0
 */

/* eslint-disable functional/functional-parameters, functional/prefer-readonly-type, @typescript-eslint/unbound-method */

import * as Sum from "@unsplash/sum-types"
import { constant, flow, pipe } from "fp-ts/function"
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

type ValueByTag<A extends Sum.AnyMember, K extends Tag<A>> = Value<
  Extract<A, Sum.Member<K, unknown>>
>

type NullaryMember = Sum.Member<string>

type Primitive = string | number | boolean | bigint | undefined | null

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
 * Excess property checking at function boundaries should protect us against
 * excess keys, however without an assertion, encapsulated here, `Object.keys`
 * will still err on the side of caution and widen `Array<Tag<A>>` to
 * `Array<string>`.
 */
const getTags: <A extends Sum.AnyMember>(
  x: Record<Tag<A>, unknown>,
) => Array<Tag<A>> = Object.keys

/**
 * Unlike `t.union` this requires only at least one member rather than two.
 */
const union1 = <A extends [t.Mixed, ...Array<t.Mixed>]>(
  xs: A,
  name = "union1",
): t.UnionType<A, t.TypeOf<A[number]>, t.OutputOf<A[number]>> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  xs[1] === undefined
    ? (new t.UnionType(
        name,
        xs[0].is,
        xs[0].validate,
        xs[0].encode,
        xs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any)
    : t.union(xs as unknown as [t.Mixed, t.Mixed, ...Array<t.Mixed>], name)

/**
 * Derive a codec for nullary members to/from any other type. Necessary for many
 * object-based use cases. If the encoded representation is `null` then
 * `nullary` can be directly used instead.
 *
 * @example
 * import * as t from "io-ts"
 * import { nullaryFrom } from "@unsplash/sum-types-io-ts"
 *
 * // This will decode any object to null and encode to an empty object.
 * nullaryFrom({})(t.type({}))
 *
 * // Equivalent to `nullary`.
 * nullaryFrom(null)(t.null)
 *
 * @since 0.7.0
 */
export const nullaryFrom =
  <A>(to: A) =>
  (from: t.Type<A, unknown>): t.Type<null, A, unknown> =>
    new t.Type(
      "foo",
      t.null.is,
      (i, c) => pipe(from.validate(i, c), E.map(constant(null))),
      constant(to),
    )

/**
 * A representation of nullary member values that encodes to `undefined` for
 * better JSON interop.
 *
 * @since 0.7.0
 */
export const nullary: t.Type<null, undefined> = nullaryFrom(undefined)(
  t.undefined,
)

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
      ([x, ...ys]) => union1([x, ...ys], name),
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
 *   getCodecFromMappedNullaryTag(Weather)(
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
 *     (x): Country => (x === "Sun" ? "Italy" : "UK"),
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
    )(getTags(tos), name)

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

/**
 * Supports any encoded representation of nullary member values.
 *
 * @example
 * ExternallyTagged<Weather, ...> = { Sun: null } | { Rain: { mm: number } }
 */
type ExternallyTagged<
  A extends Sum.AnyMember,
  B extends MemberCodecs<A>,
> = A extends Sum.AnyMember
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { [_ in Tag<A>]: B[Tag<A>] extends t.Type<any, infer C> ? C : never }
  : never

const getExternallyTaggedMemberCodec =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <B extends Tag<A>>(k: B) =>
  <C>(vc: t.Type<ValueByTag<A, B>, C>, name = "Sum"): t.Type<A, Record<B, C>> =>
    new t.Type(
      name,
      (x): x is A =>
        pipe(
          unknownSerialize(x),
          O.exists(y => y[0] === k && vc.is(y[1])),
        ),
      (i, ctx) =>
        pipe(
          // Nullary/undefined will succeed on missing key, so we need to check
          // that manually.
          typeof i === "object" && i !== null && k in i
            ? E.right(i)
            : t.failure(i, ctx, `Missing key ${k}`),
          E.chain(x => t.strict({ [k]: vc }).validate(x, ctx)),
          E.map(x =>
            Sum.deserialize(sum)([k, x[k]] as unknown as Sum.Serialized<A>),
          ),
        ),
      flow(
        Sum.serialize,
        ([k, v]) => ({ [k]: vc.encode(v as ValueByTag<A, B>) } as Record<B, C>),
      ),
    )

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding to an object tagged by the sum member tag.
 *
 * Should the types overlap, the first valid codec will succeed.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { nullary, getExternallyTaggedCodec } from "@unsplash/sum-types-io-ts"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain", number>
 * const Weather = Sum.create<Weather>()
 *
 * const WeatherCodec = getExternallyTaggedCodec(Weather)({
 *   Sun: nullary,
 *   Rain: t.number,
 * })
 *
 * assert.deepStrictEqual(
 *   WeatherCodec.decode({ Sun: undefined }),
 *   E.right(Weather.mk.Sun),
 * )
 *
 * assert.deepStrictEqual(
 *   WeatherCodec.decode({ Rain: 123 }),
 *   E.right(Weather.mk.Rain(123)),
 * )
 *
 * @since 0.7.0
 */
export const getExternallyTaggedCodec =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <C extends MemberCodecs<A>>(
    cs: C,
    name = "Sum",
  ): t.Type<A, ExternallyTagged<A, C>> =>
    pipe(
      cs,
      // NB `R.toArray` doesn't preserve object order.
      Object.entries,
      A.map(([tag, codec]) =>
        getExternallyTaggedMemberCodec(sum)(tag as Tag<A>)(
          codec as t.Type<Value<A>>,
          name,
        ),
      ),
      ([x, ...ys]) => union1([x, ...ys]),
    ) as unknown as t.Type<A, ExternallyTagged<A, C>>

/**
 * Supports any encoded representation of nullary member values.
 *
 * @example
 * AdjacentlyTagged<"k", "v", Weather, ...> = { k: Sun; v: null } | { k: Rain; v: { mm: number } }
 */
type AdjacentlyTagged<
  K extends string,
  V extends string,
  A extends Sum.AnyMember,
  B extends MemberCodecs<A>,
> = A extends Sum.AnyMember
  ? {
      [_ in K]: Tag<A>
    } & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [_ in V]: B[Tag<A>] extends t.Type<any, infer C> ? C : never
    }
  : never

const getAdjacentlyTaggedMemberCodec =
  <K extends string>(tagKey: K) =>
  <V extends string>(valueKey: V) =>
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <B extends Tag<A>>(tag: B) =>
  <C>(
    vc: t.Type<ValueByTag<A, B>, C>,
    name = "Sum",
  ): t.Type<A, Record<K, B> & Record<V, C>> =>
    new t.Type(
      name,
      (x): x is A =>
        pipe(
          unknownSerialize(x),
          O.exists(y => y[0] === tag && vc.is(y[1])),
        ),
      (i, ctx) =>
        pipe(
          t
            .strict({ [tagKey]: t.literal(tag), [valueKey]: vc })
            .validate(i, ctx),
          E.map(x =>
            Sum.deserialize(sum)([
              tag,
              x[valueKey],
            ] as unknown as Sum.Serialized<A>),
          ),
        ),
      flow(
        Sum.serialize,
        ([k, v]) =>
          ({
            [tagKey]: k,
            [valueKey]: vc.encode(v as ValueByTag<A, B>),
          } as Record<K, B> & Record<V, C>),
      ),
    )

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding to an object with sibling member tags and
 * values.
 *
 * Due to the distinct, isolated member tag, it's not possible for overlaps to
 * occur.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { nullary, getAdjacentlyTaggedCodec } from "@unsplash/sum-types-io-ts"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain", number>
 * const Weather = Sum.create<Weather>()
 *
 * const WeatherCodec = getAdjacentlyTaggedCodec("tag")("value")(Weather)({
 *   Sun: nullary,
 *   Rain: t.number,
 * })
 *
 * assert.deepStrictEqual(
 *   WeatherCodec.decode({ tag: "Sun" }),
 *   E.right(Weather.mk.Sun),
 * )
 *
 * assert.deepStrictEqual(
 *   WeatherCodec.decode({ tag: "Rain", value: 123 }),
 *   E.right(Weather.mk.Rain(123)),
 * )
 *
 * @since 0.7.0
 */
export const getAdjacentlyTaggedCodec =
  <K extends string>(tagKey: K) =>
  <V extends string>(valueKey: V) =>
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <C extends MemberCodecs<A>>(
    cs: C,
    name = "Sum",
  ): t.Type<A, AdjacentlyTagged<K, V, A, C>> =>
    pipe(
      cs,
      // NB `R.toArray` doesn't preserve object order.
      Object.entries,
      A.map(([tag, codec]) =>
        getAdjacentlyTaggedMemberCodec(tagKey)(valueKey)(sum)(tag as Tag<A>)(
          codec as t.Type<Value<A>>,
          name,
        ),
      ),
      ([x, ...ys]) => union1([x, ...ys]),
    ) as unknown as t.Type<A, AdjacentlyTagged<K, V, A, C>>

/**
 * Supports any encoded representation of nullary member values.
 *
 * @example
 * Untagged<Weather, ...> = {} | { mm: number }
 */
type Untagged<
  A extends Sum.AnyMember,
  B extends MemberCodecs<A>,
> = A extends Sum.AnyMember
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    B[Tag<A>] extends t.Type<any, infer C>
    ? C
    : never
  : never

const getUntaggedMemberCodec =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <B extends Tag<A>>(k: B) =>
  <C>(c: t.Type<ValueByTag<A, B>, C>, name = "Sum"): t.Type<A, C> =>
    new t.Type(
      name,
      (x): x is A =>
        pipe(
          unknownSerialize(x),
          O.exists(y => y[0] === k && c.is(y[1])),
        ),
      (i, ctx) =>
        pipe(
          c.validate(i, ctx),
          E.map(v =>
            Sum.deserialize(sum)([k, v] as unknown as Sum.Serialized<A>),
          ),
        ),
      flow(Sum.serialize, x => x[1] as ValueByTag<A, B>, c.encode),
    )

/**
 * Derive a codec for any given sum `A` provided codecs for all its members'
 * values, decoding and encoding directly to/from the member codecs.
 *
 * Should the types overlap, the first valid codec will succeed.
 *
 * @example
 * import * as t from "io-ts"
 * import * as Sum from "@unsplash/sum-types"
 * import { nullaryFrom, getUntaggedCodec } from "@unsplash/sum-types-io-ts"
 * import * as E from "fp-ts/Either"
 *
 * type Weather = Sum.Member<"Sun"> | Sum.Member<"Rain", { mm: number }>
 * const Weather = Sum.create<Weather>()
 *
 * const WeatherFromRainfall = getUntaggedCodec(Weather)({
 *   Rain: t.strict({ mm: t.number }),
 *   // This codec will match any object so it needs to come last.
 *   Sun: nullaryFrom({})(t.strict({})),
 * })
 *
 * assert.deepStrictEqual(
 *   WeatherFromRainfall.decode({ mm: 123, foo: 'bar' }),
 *   E.right(Weather.mk.Rain({ mm: 123 })),
 * )
 *
 * assert.deepStrictEqual(
 *   WeatherFromRainfall.decode({ foo: 'bar' }),
 *   E.right(Weather.mk.Sun),
 * )
 *
 * @since 0.7.0
 */
export const getUntaggedCodec =
  <A extends Sum.AnyMember>(sum: Sum.Sum<A>) =>
  <C extends MemberCodecs<A>>(cs: C, name = "Sum"): t.Type<A, Untagged<A, C>> =>
    pipe(
      cs,
      // NB `R.toArray` doesn't preserve object order.
      Object.entries,
      A.map(([tag, codec]) =>
        getUntaggedMemberCodec(sum)(tag as Tag<A>)(
          codec as t.Type<Value<A>>,
          name,
        ),
      ),
      ([x, ...ys]) => union1([x, ...ys]),
    ) as t.Type<A, Untagged<A, C>>
