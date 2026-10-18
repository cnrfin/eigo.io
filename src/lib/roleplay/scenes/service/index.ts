import izakayaGuests from './izakaya-guests.json'
import type { Scene } from '../../types'

/**
 * 接客 (Serving guests): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [izakayaGuests] as Scene[]
