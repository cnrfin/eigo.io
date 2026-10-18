import cafeAbroad from './cafe-abroad.json'
import restaurantAbroad from './restaurant-abroad.json'
import hotelCheckIn from './hotel-check-in.json'
import airportCheckIn from './airport-check-in.json'
import immigration from './immigration.json'
import taxiAbroad from './taxi-abroad.json'
import ticketsAbroad from './tickets-abroad.json'
import returnItem from './return-item.json'
import pharmacyAbroad from './pharmacy-abroad.json'
import lostLuggage from './lost-luggage.json'
import type { Scene } from '../../types'

/**
 * 海外旅行 (Travel): the scenes in this folder, in the order the pickers list them.
 * Add a scene: put its JSON here (file name = its id) and list it below. Then run: npm run check:roleplay
 */
export const scenes = [cafeAbroad, restaurantAbroad, hotelCheckIn, airportCheckIn, immigration, taxiAbroad, ticketsAbroad, returnItem, pharmacyAbroad, lostLuggage] as Scene[]
