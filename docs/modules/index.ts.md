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
  - [getCodec](#getcodec)
  - [getCodecFromMappedNullaryTag](#getcodecfrommappednullarytag)
  - [getCodecFromNullaryTag](#getcodecfromnullarytag)
  - [getCodecFromSerialized](#getcodecfromserialized)
  - [getCodecFromStringlyMappedNullaryTag](#getcodecfromstringlymappednullarytag)
  - [getSerializedCodec](#getserializedcodec)

---

# utils

## getCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values.

**Signature**

```ts
export declare const getCodec: <A extends Sum.AnyMember>() => <B extends MemberCodecs<A>>(
  cs: B,
  name?: string
) => t.Type<A, OutputsOf<A, B>, unknown>
```

Added in v0.1.0

## getCodecFromMappedNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags via conversion
functions. Consider instead `getCodecFromStringlyMappedNullaryTag` for
stringly APIs.

**Signature**

```ts
export declare const getCodecFromMappedNullaryTag: <A extends NullaryMember>() => <B>(
  from: (x: unknown) => O.Option<Tag<A>>,
  to: (x: Tag<A>) => B
) => <C>(tags: EveryKeyPresent<Tag<A>, C>, name?: string) => t.Type<A, B, unknown>
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

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromMappedNullaryTag<Weather>()<Country>(
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
  (x) => (x === 'Sun' ? 'Italy' : 'UK')
)(['Sun', 'Rain'])

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain()))
```

Added in v0.3.0

## getCodecFromNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags.

**Signature**

```ts
export declare const getCodecFromNullaryTag: <A extends NullaryMember>() => <B>(
  tags: EveryKeyPresent<Tag<A>, B>,
  name?: string
) => t.Type<A, string, unknown>
```

Added in v0.3.0

## getCodecFromSerialized

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to/from `Serialized<A>`.

**Signature**

```ts
export declare const getCodecFromSerialized: <A extends Sum.AnyMember>() => <B extends MemberCodecs<A>>(
  cs: B,
  name?: string
) => t.Type<A, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0

## getCodecFromStringlyMappedNullaryTag

A convenient alternative to `getCodecFromMappedNullaryTag` for working with
stringly APIs. The behaviour is unspecified if the input `Record` contains
duplicate values.

**Signature**

```ts
export declare const getCodecFromStringlyMappedNullaryTag: <A extends NullaryMember>() => <B extends string>(
  tos: Record<Tag<A>, B>,
  name?: string
) => t.Type<A, B, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { getCodecFromStringlyMappedNullaryTag } from '@unsplash/sum-types-io-ts'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain'>
const Weather = Sum.create<Weather>()
type Country = 'UK' | 'Italy'

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromStringlyMappedNullaryTag<Weather>()({
  Sun: 'Italy',
  Rain: 'UK',
})

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain()))
```

Added in v0.3.0

-

## getSerializedCodec

Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
all its members` values.

**Signature**

```ts
export declare const getSerializedCodec: <A extends Sum.AnyMember>() => <B extends MemberCodecs<A>>(
  cs: B,
  name?: string
) => t.Type<Sum.Serialized<A>, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0
