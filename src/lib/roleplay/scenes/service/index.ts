import izakayaGuests from './izakaya-guests.json'
import clothesShop from './clothes-shop.json'
import hotelFrontDesk from './hotel-front-desk.json'
import snackBar from './snack-bar.json'
import salonMassage from './salon-massage.json'
import infoCounter from './info-counter.json'
import taxiDriver from './taxi-driver.json'
import convenienceStore from './convenience-store.json'
import ramenShop from './ramen-shop.json'
import ryokanOnsen from './ryokan-onsen.json'
import type { Scene } from '../../types'

/**
 * 接客 (Serving guests): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [izakayaGuests, clothesShop, hotelFrontDesk, snackBar, salonMassage, infoCounter, taxiDriver, convenienceStore, ramenShop, ryokanOnsen] as Scene[]
