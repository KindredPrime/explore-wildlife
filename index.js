"use strict";

/*
    Searches for wildlife
*/
function wildlifeSearch() {
    const locationIQKey = "c8f4ef91fa2470";
    let street;
    let city;
    let county;
    let state;
    let country;
    let postalCode;
    let radius;
    let wildlifeTypes;
    let name;
    let startDate;
    let endDate;

    /*
        Convert the wildlife types to the parameters expected by the iNaturalist API
    */
    function convertWildlifeTypesToTaxa() {
        const wildlifeIconicTaxaConversion = {
            plants: "Plantae",
            mollusks: "Mollusca",
            reptiles: "Reptilia",
            birds: "Aves",
            amphibians: "Amphibia",
            fish: "Actinopterygii",
            mammals: "Mammalia",
            insects: "Insecta",
            arachnids: "Arachnida",
            fungi: "Fungi",
            unknown: "Unknown"
        };
        
        return wildlifeTypes.map(wildlifeType => wildlifeIconicTaxaConversion[wildlifeType]);
    }

    /*
        Fetch wildlife data from the iNaturalist API, then call the display function
    */
    function getWildlifeData(latitude, longitude) {
        const baseUrl = "https://api.inaturalist.org/v1/observations";

        const iconicTaxa = convertWildlifeTypesToTaxa();

        const params = {
            lat: latitude,
            lng: longitude,
            radius: radius,
            iconic_taxa: iconicTaxa,
            taxon_name: name,
            d1: startDate,
            d2: endDate,
            photos: "true",
            order_by: "species_guess"
        }
        const queryParams = formatQueryParams(params);
        
        const url = baseUrl + "?" + queryParams;

        fetch(url)
        .then(response => {
            if(response.ok) {
                return response.json();
            }
            else {
                throw Error(reponse.statusText);
            }
        })
        .then(responseJson => {
            console.log("----------Wildlife data found----------");
            console.log(responseJson);
        })
        .catch(error => {
            console.log(`Something went wrong while fetching the wildlife data: ${error.message}`);
        });
    }

    /*
        Convert the provided parameters into an HTTP-friendly format
    */
    function formatQueryParams(params) {
        const populatedParams = Object.keys(params).filter(key => params[key].length > 0);

        const queryItems = populatedParams.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
        return queryItems.join("&");
    }

    /*
        Use the LocationIQ API to convert the provided address into latitude and longitude coordinates, then fetch the wildlife data
    */
    function getLatLonCoordinates() {
        let coordinates = {};
        
        const baseUrl = "https://us1.locationiq.com/v1/search.php";
        const params = {
            "key": locationIQKey,
            "street": street,
            "city": city,
            "county": county,
            "state": state,
            "country": country,
            "postalCode": postalCode,
            "format": "json"
        };
        const queryParams = formatQueryParams(params);
        const url = baseUrl + "?" + queryParams;

        fetch(url)
        .then(response => {
            if(response.ok) {
                return response.json();
            }
            else {
                throw Error(response.statusText);
            }
        })
        .then(responseJson => {
            console.log("----------Coordinates found for the provided address----------");
            console.log(responseJson);

            // For now just grab the coordinates of the first location in the response
            const latitude = responseJson[0].lat;
            const longitude = responseJson[0].lon;
            
            getWildlifeData(latitude, longitude);
        })
        .catch(error => {
            console.log(`Something went wrong when fetching the latitude and longitude coordinates: ${error.message}`);
        });
    }

    /*
        Return an array of values containing which "Types of Wildlife" checkboxes have been checked
    */
    function getWildlifeTypes() {
        const wildlifeTypes = [];
        const wildlifeCheckedBoxes = $(`.wildlife-types input[name="wildlife-type"]:checked`);

        wildlifeCheckedBoxes.each(index => {
            const wildlifeCheckedBox = wildlifeCheckedBoxes[index];
            const checkboxValue = $(wildlifeCheckedBox).attr("value");
            wildlifeTypes.push(checkboxValue);
        });
        
        return wildlifeTypes;
    }

    /*
        Process the user's search parameters and output the resulting wildlife
    */
    function handleSearchSubmit() {
        $(".search-form").submit(event => {
            event.preventDefault();

            /*
                Steps:
                grab the user input: Done
                convert the address to lat/lon coordinates: Done
                fetch wildlife data
                display wildlife data
            */
            street = $("#search-street").val();
            city = $("#search-city").val();
            county = $("#search-county").val();
            state = $("#search-state").val();
            country = $("#search-country").val();
            postalCode = $("#search-postal-code").val();
            radius = $("#search-radius").val();
            wildlifeTypes = getWildlifeTypes();
            name = $("#organism-name").val();
            startDate = $("#search-start").val();
            endDate = $("#search-end").val();

            const coordinates = getLatLonCoordinates();
        });
    }

    handleSearchSubmit();
}

$(function() {
    wildlifeSearch();
});