import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

const KEY = process.env.LOCATION_IQ_KEY!;
const REVERSE_LOCATION_URL = process.env.REVERSE_LOCATION_URL!;
const AUTOCOMPLETE_LOCATION_URL = process.env.AUTOCOMPLETE_LOCATION_URL!;

export const getLocationSuggestions = async(querry:string)=>{
    try {
        const url = `${AUTOCOMPLETE_LOCATION_URL}${KEY}&q=${querry}`;
        console.log("Fetching location suggestions from:", url);
        const response = await axios.get(url);
        const suggestions = response?.data;
        if(!suggestions) throw new Error("No suggestions from location iq api");
        return suggestions.map((e:any)=>{
              return {
                place:e.display_place,
                address:e.display_address,
                lat:e.lat,
                lon:e.lon
              }
        })
    } catch (error) {
        console.log("Error while fetching suggestions from location iq api",error);
        throw error;
    }
}

export const reverseLocation = async(latitude:number,longitude:number)=>{
    try {
        const url = `${REVERSE_LOCATION_URL}${KEY}&lat=${latitude}&lon=${longitude}&format=json`;
        const response = await axios.get(url);
        if(!response.data?.display_name) throw new Error("No display name from location iq api");
        return response.data.display_name;
    } catch (error) {
        console.log("Error while reversing location from location ip api",error);
        throw error;
    }
}