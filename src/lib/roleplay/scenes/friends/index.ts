import languageExchange from './language-exchange.json'
import weekendPlans from './weekend-plans.json'
import recommendJapan from './recommend-japan.json'
import hobbies from './hobbies.json'
import homeParty from './home-party.json'
import travelStories from './travel-stories.json'
import declineInvite from './decline-invite.json'
import japaneseCustoms from './japanese-customs.json'
import birthday from './birthday.json'
import shareHouse from './share-house.json'
import type { Scene } from '../../types'

/**
 * 友だち (Friends): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [languageExchange, weekendPlans, recommendJapan, hobbies, homeParty, travelStories, declineInvite, japaneseCustoms, birthday, shareHouse] as Scene[]
