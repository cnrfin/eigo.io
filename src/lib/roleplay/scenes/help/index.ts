import stationTransfer from './station-transfer.json'
import streetDirections from './street-directions.json'
import touristTrouble from './tourist-trouble.json'
import ticketMachine from './ticket-machine.json'
import takeAPhoto from './take-a-photo.json'
import restaurantHelp from './restaurant-help.json'
import recommendSights from './recommend-sights.json'
import shrineManners from './shrine-manners.json'
import neighbourRules from './neighbour-rules.json'
import earthquakeHelp from './earthquake-help.json'
import type { Scene } from '../../types'

/**
 * 日本で助ける (Helping in Japan): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [stationTransfer, streetDirections, touristTrouble, ticketMachine, takeAPhoto, restaurantHelp, recommendSights, shrineManners, neighbourRules, earthquakeHelp] as Scene[]
