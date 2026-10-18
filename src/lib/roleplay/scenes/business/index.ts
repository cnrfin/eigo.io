import workIntro from './work-intro.json'
import meetingSmallTalk from './meeting-small-talk.json'
import businessDinner from './business-dinner.json'
import presentationQa from './presentation-qa.json'
import negotiation from './negotiation.json'
import scheduleCall from './schedule-call.json'
import airportPickup from './airport-pickup.json'
import customerCall from './customer-call.json'
import meetingOpinion from './meeting-opinion.json'
import apologiseDelay from './apologise-delay.json'
import type { Scene } from '../../types'

/**
 * ビジネス (Business): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [workIntro, meetingSmallTalk, businessDinner, presentationQa, negotiation, scheduleCall, airportPickup, customerCall, meetingOpinion, apologiseDelay] as Scene[]
