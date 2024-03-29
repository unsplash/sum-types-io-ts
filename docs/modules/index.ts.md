---
title: index.ts
nav_order: 1
parent: Modules
---

## index overview

Added in v0.1.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [MappedType (class)](#mappedtype-class)
    - [\_tag (property)](#_tag-property)
  - [getAdjacentlyTaggedCodec](#getadjacentlytaggedcodec)
  - [getCodec](#getcodec)
  - [getCodecFromMappedNullaryTag](#getcodecfrommappednullarytag)
  - [getCodecFromNullaryTag](#getcodecfromnullarytag)
  - [getCodecFromPrimitiveMappedNullaryTag](#getcodecfromprimitivemappednullarytag)
  - [getCodecFromSerialized](#getcodecfromserialized)
  - [getExternallyTaggedCodec](#getexternallytaggedcodec)
  - [getInternallyTaggedCodec](#getinternallytaggedcodec)
  - [getSerializedCodec](#getserializedcodec)
  - [getUntaggedCodec](#getuntaggedcodec)
  - [nullaryFrom](#nullaryfrom)
  - [nullaryFromEmpty](#nullaryfromempty)

---

# utils

## MappedType (class)

**Signature**

```ts
export declare class MappedType<A, B> {
  constructor(
    name: string,
    is: MappedType<A, B>['is'],
    validate: MappedType<A, B>['validate'],
    encode: MappedType<A, B>['encode'],
    readonly Map: Record<Tag<A>, B>
  )
}
```

Added in v0.5.1

### \_tag (property)

**Signature**

```ts
readonly _tag: "@unsplash/sum-types-io-ts/MappedType"
```

Added in v0.5.1

## getAdjacentlyTaggedCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to an object with sibling member tags and
values.

Due to the distinct, isolated member tag, it's not possible for overlaps to
occur.

**Signature**

```ts
export declare const getAdjacentlyTaggedCodec: <K extends string>(
  tagKey: K
) => <V extends string>(
  valueKey: V
) => <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <C extends MemberCodecs<A, unknown>>(cs: C, name?: string) => t.Type<A, AdjacentlyTagged<K, V, A, C>, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { nullaryFromEmpty, getAdjacentlyTaggedCodec } from '@unsplash/sum-types-io-ts'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain', number>
const Weather = Sum.create<Weather>()

const WeatherCodec = getAdjacentlyTaggedCodec('tag')('value')(Weather)({
  Sun: nullaryFromEmpty,
  Rain: t.number,
})

assert.deepStrictEqual(WeatherCodec.decode({ tag: 'Sun' }), E.right(Weather.mk.Sun))

assert.deepStrictEqual(WeatherCodec.decode({ tag: 'Rain', value: 123 }), E.right(Weather.mk.Rain(123)))
```

Added in v0.7.0

## getCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values.

**Signature**

```ts
export declare const getCodec: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <B extends MemberCodecs<A, unknown>>(cs: B, name?: string) => t.Type<A, OutputsOf<A, B>, unknown>
```

Added in v0.1.0

## getCodecFromMappedNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags via conversion
functions. Consider instead `getCodecFromPrimitiveMappedNullaryTag` for
stringly APIs.

**Signature**

```ts
export declare const getCodecFromMappedNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <O, I>(
  from: (x: I) => O.Option<Tag<A>>,
  to: (x: Tag<A>) => O
) => <C>(tags: EveryKeyPresent<Tag<A>, C>, name?: string) => t.Type<A, O, I>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { getCodecFromMappedNullaryTag } from '@unsplash/sum-types-io-ts'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain'>
const Weather = Sum.create<Weather>()
type Country = 'UK' | 'Italy'

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromMappedNullaryTag(Weather)(
  (x) => {
    switch (x) {
      case 'Italy':
        return O.some('Sun')
      case 'UK':
        return O.some('Rain')
      default:
        return O.none
    }
  },
  (x): Country => (x === 'Sun' ? 'Italy' : 'UK')
)(['Sun', 'Rain'])

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain))
```

Added in v0.3.0

## getCodecFromNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags.

**Signature**

```ts
export declare const getCodecFromNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <B>(tags: EveryKeyPresent<Tag<A>, B>, name?: string) => t.Type<A, string, unknown>
```

Added in v0.3.0

## getCodecFromPrimitiveMappedNullaryTag

A convenient alternative to `getCodecFromMappedNullaryTag` for working with
for example stringly APIs. The behaviour is unspecified if the input `Record`
contains duplicate values.

**Signature**

```ts
export declare const getCodecFromPrimitiveMappedNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <B extends string | number | bigint | boolean | null | undefined>(
  tos: Record<Tag<A>, B>,
  name?: string
) => MappedType<A, B>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { getCodecFromPrimitiveMappedNullaryTag } from '@unsplash/sum-types-io-ts'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain'>
const Weather = Sum.create<Weather>()
type Country = 'UK' | 'Italy'

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromPrimitiveMappedNullaryTag(Weather)({
  Sun: 'Italy',
  Rain: 'UK',
})

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain))
```

Added in v0.5.0

## getCodecFromSerialized

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to/from `Serialized<A>`.

**Signature**

```ts
export declare const getCodecFromSerialized: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <B extends MemberCodecs<A, unknown>>(cs: B, name?: string) => t.Type<A, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0

## getExternallyTaggedCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to an object tagged by the sum member tag.

Should the types overlap, the first valid codec will succeed.

**Signature**

```ts
export declare const getExternallyTaggedCodec: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <C extends MemberCodecs<A, unknown>>(cs: C, name?: string) => t.Type<A, ExternallyTagged<A, C>, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { nullaryFromEmpty, getExternallyTaggedCodec } from '@unsplash/sum-types-io-ts'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain', number>
const Weather = Sum.create<Weather>()

const WeatherCodec = getExternallyTaggedCodec(Weather)({
  Sun: nullaryFromEmpty,
  Rain: t.number,
})

assert.deepStrictEqual(WeatherCodec.decode({ Sun: undefined }), E.right(Weather.mk.Sun))

assert.deepStrictEqual(WeatherCodec.decode({ Rain: 123 }), E.right(Weather.mk.Rain(123)))
```

Added in v0.7.0

## getInternallyTaggedCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to an object with sibling member tags and
values.

Due to the distinct, isolated member tag, it's not possible for overlaps to
occur.

**Signature**

```ts
export declare const getInternallyTaggedCodec: <K extends string>(
  tagKey: K
) => <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <C extends MemberCodecs<A, Record<string, unknown> | null | undefined>>(
  cs: C,
  name?: string
) => t.Type<A, InternallyTagged<K, A, C>, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { nullaryFromEmpty, getInternallyTaggedCodec } from '@unsplash/sum-types-io-ts'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain', { mm: number }>
const Weather = Sum.create<Weather>()

const WeatherCodec = getInternallyTaggedCodec('tag')(Weather)({
  Sun: nullaryFromEmpty,
  Rain: t.strict({ mm: t.number }),
})

assert.deepStrictEqual(WeatherCodec.decode({ tag: 'Sun' }), E.right(Weather.mk.Sun))

assert.deepStrictEqual(WeatherCodec.decode({ tag: 'Rain', mm: 123 }), E.right(Weather.mk.Rain({ mm: 123 })))
```

Added in v0.7.0

## getSerializedCodec

Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
all its members` values.

**Signature**

```ts
export declare const getSerializedCodec: <A extends Sum.AnyMember>() => <B extends MemberCodecs<A, unknown>>(
  cs: B,
  name?: string
) => t.Type<Sum.Serialized<A>, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0

## getUntaggedCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding directly to/from the member codecs.

Should the types overlap, the first valid codec will succeed.

**Signature**

```ts
export declare const getUntaggedCodec: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <C extends MemberCodecs<A, unknown>>(cs: C, name?: string) => t.Type<A, Untagged<A, C>, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { nullaryFromEmpty, getUntaggedCodec } from '@unsplash/sum-types-io-ts'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain', { mm: number }>
const Weather = Sum.create<Weather>()

const WeatherFromRainfall = getUntaggedCodec(Weather)({
  Rain: t.strict({ mm: t.number }),
  // This codec will match any object so it needs to come last.
  Sun: nullaryFromEmpty,
})

assert.deepStrictEqual(WeatherFromRainfall.decode({ mm: 123, foo: 'bar' }), E.right(Weather.mk.Rain({ mm: 123 })))

assert.deepStrictEqual(WeatherFromRainfall.decode({ foo: 'bar' }), E.right(Weather.mk.Sun))
```

Added in v0.7.0

## nullaryFrom

Derive a codec for nullary members to/from any other type. If the encoded
representation forms part of an object then `nullaryFromEmpty` can be used
instead. Incompatible with `Serialized` if not encoding to `null`.

**Signature**

```ts
export declare const nullaryFrom: <A>(to: A) => (from: t.Type<A, unknown, unknown>) => t.Type<null, A, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import { nullaryFrom } from '@unsplash/sum-types-io-ts'

// This will decode any object to null and encode to an empty object. Instead
// consider `nullaryFromEmpty`.
nullaryFrom({})(t.type({}))
```

Added in v0.7.0

## nullaryFromEmpty

A representation of nullary member values that encodes to `undefined` for
better JSON interop, and decodes from `undefined`, `null`, or empty objects
(i.e. any object). Incompatible with `Serialized`.

**Signature**

```ts
export declare const nullaryFromEmpty: t.Type<null, Record<string, unknown> | null | undefined, unknown>
```

Added in v0.7.0
