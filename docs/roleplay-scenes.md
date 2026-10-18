# Role-play scenes: the list

50 scenes, 10 per category: situations where Japanese adults really need English, in daily life, at work and when travelling. How to write one: `docs/roleplay-authoring.md`.

Each category is one **batch**, written in one session in its own folder (`src/lib/roleplay/scenes/<category>/`), so batches can be written at the same time without clashing. List the scenes in the folder's `index.ts` in this order.

- **Role a** is the role the student plays first; **role b** is the AI tutor's (the student plays it after swapping).
- **Prop**: what the student can open on screen (— = none).
- **Twist idea** (上級, optional): a suggestion; leave it out if it doesn't fit. About half the scenes should have one.
- ✓ = already written (don't change it).

## Batch 1: travel (海外旅行)

| # | id | Scene | Role a | Role b | Prop | Twist idea |
|---|---|---|---|---|---|---|
| 1 | `cafe-abroad` ✓ | 海外のカフェで注文 | customer | barista | menu | card machine down |
| 2 | `restaurant-abroad` | レストランで食事（英語が共通語の国） | diner | server | menu | dish sold out |
| 3 | `hotel-check-in` | ホテルにチェックイン | guest | front desk | booking confirmation | room not ready yet |
| 4 | `airport-check-in` | 空港でチェックイン・搭乗口 | passenger | airline staff | boarding pass | bag over the weight limit |
| 5 | `immigration` | 入国審査で質問に答える | traveller | immigration officer | — | asked where you're staying (no address to hand) |
| 6 | `taxi-abroad` | タクシー・配車アプリで行き先を伝える | passenger | driver | map | road closed, new route |
| 7 | `tickets-abroad` | 駅で切符を買って乗り方を聞く | traveller | station staff | timetable | train cancelled |
| 8 | `return-item` | お店で返品・交換 | customer | shop assistant | receipt | no receipt |
| 9 | `pharmacy-abroad` | 薬局で症状を伝える | customer | pharmacist | — | — |
| 10 | `lost-luggage` | 荷物が届かない（空港のカウンター） | passenger | baggage desk staff | claim form | — |

## Batch 2: help (日本で助ける)

| # | id | Scene | Role a | Role b | Prop | Twist idea |
|---|---|---|---|---|---|---|
| 1 | `station-transfer` | 駅で乗り換えを聞かれる | local | tourist | route map | the line is delayed |
| 2 | `street-directions` | 街で道をたずねられる | local | tourist | map | the place has moved/closed |
| 3 | `tourist-trouble` | 困っている観光客を助ける（落とし物など） | local | tourist | — | the lost item is a passport |
| 4 | `ticket-machine` | 券売機・ICカードの買い方を教える | local | tourist | fare chart | machine only takes cash |
| 5 | `take-a-photo` | 写真を撮ってと頼まれる | local | tourist | — | — |
| 6 | `restaurant-help` | 食券機や注文を手伝う | local | tourist | menu | the tourist is vegetarian |
| 7 | `recommend-sights` | 観光地や行き方をすすめる | local | tourist | area map | it's raining: an indoor idea |
| 8 | `shrine-manners` | 神社やお寺のマナーを説明する | local | tourist | — | — |
| 9 | `neighbour-rules` | 外国人のご近所さんにゴミ出しを説明する | neighbour | new neighbour | garbage calendar | — |
| 10 | `earthquake-help` | 地震のとき外国人を案内する | local | tourist | evacuation map | — |

## Batch 3: service (接客)

| # | id | Scene | Role a | Role b | Prop | Twist idea |
|---|---|---|---|---|---|---|
| 1 | `izakaya-guests` ✓ | 居酒屋で外国人のお客さんを接客 | staff | guest | menu | shellfish allergy |
| 2 | `clothes-shop` | アパレル・雑貨店で接客（サイズ・免税） | shop staff | customer | price tags | no passport for tax-free |
| 3 | `hotel-front-desk` | ホテルのフロントで対応 | front desk | guest | booking | the guest wants an early check-in |
| 4 | `snack-bar` | スナック・バーで外国人客と会話 | bartender | customer | drinks list | — |
| 5 | `salon-massage` | マッサージ・美容室で接客 | staff | customer | treatment menu | the customer has a sore back |
| 6 | `info-counter` | 空港・駅の案内カウンター | staff | traveller | timetable | the last train has gone |
| 7 | `taxi-driver` | タクシー運転手として | driver | passenger | map | the passenger only has a photo of the place |
| 8 | `convenience-store` | コンビニのレジで対応 | clerk | customer | — | the card is declined |
| 9 | `ramen-shop` | ラーメン店で注文・食べ方を案内 | staff | customer | menu (ticket machine) | — |
| 10 | `ryokan-onsen` | 旅館で温泉のマナーを説明する | ryokan staff | guest | facility guide | the guest has a tattoo |

## Batch 4: friends (友だち)

| # | id | Scene | Role a | Role b | Prop | Twist idea |
|---|---|---|---|---|---|---|
| 1 | `language-exchange` | 語学交流会で友だちを作る | you | new friend | — | — |
| 2 | `weekend-plans` | 週末の予定を立てる | you | friend | event flyer | the event is sold out |
| 3 | `recommend-japan` | 日本のおすすめを紹介する（食べ物・場所） | you | visiting friend | — | — |
| 4 | `hobbies` | 趣味の話で盛り上がる | you | friend | — | — |
| 5 | `home-party` | 家に招待する・招待される | host | guest | — | the guest can't eat something |
| 6 | `travel-stories` | 旅行の思い出を話す | you | friend | — | — |
| 7 | `decline-invite` | 誘いを上手に断る・予定を変える | you | friend | — | — |
| 8 | `japanese-customs` | 日本の習慣を説明する | you | friend | — | — |
| 9 | `birthday` | 誕生日をお祝いする | you | friend | — | — |
| 10 | `share-house` | シェアハウスでルールを決める | you | housemate | house rules | — |

## Batch 5: business (ビジネス)

| # | id | Scene | Role a | Role b | Prop | Twist idea |
|---|---|---|---|---|---|---|
| 1 | `work-intro` ✓ | 海外の同僚に自己紹介 | you | colleague | — | — |
| 2 | `meeting-small-talk` | オンライン会議の前の雑談 | you | colleague | meeting agenda | someone's audio isn't working |
| 3 | `business-dinner` | 出張先で取引先と会食 | you | client | menu | the client asks about a sensitive project |
| 4 | `presentation-qa` | プレゼンの質疑応答 | presenter | audience member | slide summary | a question you can't answer yet |
| 5 | `negotiation` | 価格・納期の交渉 | you (seller) | buyer | quote | the buyer wants it a week earlier |
| 6 | `schedule-call` | 電話・ビデオ通話で日程調整 | you | client | calendar | time zones |
| 7 | `airport-pickup` | 空港で取引先を出迎える | host | visitor | itinerary | the flight was delayed |
| 8 | `customer-call` | 海外のお客様からの問い合わせ電話 | you (staff) | customer | order details | the order hasn't arrived |
| 9 | `meeting-opinion` | 会議で意見を言う・やんわり反対する | you | colleague | meeting agenda | — |
| 10 | `apologise-delay` | トラブル・遅れを謝って説明する | you | client | project timeline | the client asks for a discount |
