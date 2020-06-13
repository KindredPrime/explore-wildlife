"use strict";

/*
    Convert the provided parameters into an HTTP-friendly format
*/
function formatQueryParams(params) {
    const populatedParams = Object.keys(params).filter(key => params[key].length > 0);

    const queryItems = populatedParams.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    return queryItems.join("&");
}

/*
    Handle errors that are thrown during fetches
*/
function handleFetchError(error) {
    console.log(error.message);
}

/*
    Fetch JSON data from the provided URL, and use the provided error description to explain the context of an error if it occurs during the fetch.
*/
function fetchJson(url, errorDescription) {
    return fetch(url).then(response => {
        if(response.ok) {
            return response.json();
        }
        else {
            console.log(`Error description: ${errorDescription}`)
            throw Error(`${errorDescription}: ${reponse.statusText}`);
        }
    });
}

/*
    Help the user pick a location to search for wildlife around
*/
function locationSearch() {
    const locationIQKey = "c8f4ef91fa2470";

    /*
        Convert the provided location to a string
    */
    function convertLocationToString(address) {
        let stringParts = [];
        stringParts.push(`Country: ${address.country}`);
        stringParts.push(`State: ${address.state}`);
        stringParts.push(`State District: ${address.state_district}`);
        stringParts.push(`County: ${address.county}`);
        stringParts.push(`City: ${address.city}`);
        stringParts.push(`Village: ${address.village}`);
        stringParts.push(`Postal Code: ${address.postcode}`);
        stringParts.push(`Locality: ${address.locality}`);
        stringParts.push(`Hamlet: ${address.hamlet}`);
        stringParts.push(`Neighborhood: ${address.neighbourhood}`);
        stringParts.push(`Road: ${address.road}`);

        // Remove the undefined address components
        stringParts = stringParts.filter(component => !component.includes("undefined"));

        return stringParts.join(",\n");
    }

    /*
        Display the provided locations in the found locations modal
    */
    function displayLocations(locationOptions) {        
        console.log(`Display data:`);
        console.log(locationOptions);
        console.log("");

        for(const location of locationOptions) {
            const dataToDisplay = [];
            const radioInput = `<input type="radio" id="${location.placeId}" class="location-option" name="location" value="${location.lat},${location.lon}">`;
            dataToDisplay.push(radioInput);

            let labelText = convertLocationToString(location.address);
            const labelTag = `<label for="${location.placeId}">${labelText}</label>`;
            dataToDisplay.push(labelTag);

            // Also include a break tag
            dataToDisplay.push("<br>");

            const htmlContent = dataToDisplay.join("\n");
            $(".locations-results").append(htmlContent);
        }

        // Set the first location option to be selected by default
        $(".location-option").first().attr("required", true);

        // Create the submit button
        $(".locations-results").append(`
        <button type="submit" class="submit-button location-submit">
            Submit Selected Location
        </button>
        `);

        MicroModal.show("locations-modal");
    }

    /*
        Return an array containing the relevant data from each of the provided locations
    */
    function getRelevantLocationData(locationsJson) {
        const relevantData = [];

        for(const locationJson of locationsJson) {
            const locationData = {};
            locationData.address = locationJson.address;
            locationData.lat = locationJson.lat;
            locationData.lon = locationJson.lon;
            locationData.placeId = locationJson.place_id;

            relevantData.push(locationData);
        }

        return relevantData;
    }

    /*
        Return true if at least one of the provided fields has been populated
    */
    function anyFieldIsPopulated(fieldsObject) {
        for(const field of Object.values(fieldsObject)) {
            if(field != "") {
                return true;
            }
        }

        return false;
    }

    /*
        Use the LocationIQ API to convert the provided location into latitude and longitude coordinates, then fetch the wildlife data
    */
    function getLatLonCoordinates(location) {
        const baseUrl = "https://us1.locationiq.com/v1/search.php";
        const params = {
            key: locationIQKey,
            street: location.street,
            city: location.city,
            county: location.county,
            state: location.state,
            country: location.country,
            postalCode: location.postalCode,
            format: "json",
            addressdetails: "1"
        };
        const queryParams = formatQueryParams(params);
        const url = baseUrl + "?" + queryParams;
        console.log(`Fetching data from: ${url}`);
        console.log("");

        const errorDescription = "Something went wrong when fetching the locations";
        return fetchJson(url, errorDescription);
    }

    /*
        Create an event listener for when the "Find Location" button is clicked
    */
    function handleFindLocationClick() {
        $(".find-location").click(event => {
            event.preventDefault();

            // Clear any previous errors
            $(".find-locations-error").text("");

            // Clear any previous locations results
            $(".locations-results").empty();

            // Grab user input
            const userLocation = {};
            userLocation.street = $("#search-street").val();
            userLocation.city = $("#search-city").val();
            userLocation.county = $("#search-county").val();
            userLocation.state = $("#search-state").val();
            userLocation.country = $("#search-country").val();
            userLocation.postalCode = $("#search-postal-code").val();

            if(anyFieldIsPopulated(userLocation)) {
                getLatLonCoordinates(userLocation)
                .catch(handleFetchError)
                .then(locationsJson => {
                    console.log("----------Locations found using the provided location components----------");
                    console.log(locationsJson);
                    console.log("");

                    return getRelevantLocationData(locationsJson);
                })
                .then(displayLocations)
                .catch(handleFetchError);
            }
            else {
                $(".find-locations-error").text("You must fill out at least one of the location fields")
                console.log("Error while finding location: None of the location fields were filled out");
                MicroModal.show("locations-modal");
            }
        });
    }

    /*
        Create an event listener for when the location is submitted from the modal
    */
    function handleSubmitLocation() {
        $(".locations-results").submit(event => {
            event.preventDefault();
           
            // Get the selected coordinates
            const coordinates = $(".locations-results input[name='location']:checked").val();
            console.log(`Selected coordinates: ${coordinates}`);

            // Store the selected coordinates in the "Found Location" field
            $("#found-location").val(coordinates);

            // Close the modal
            MicroModal.close("locations-modal");
        });
    }

    handleFindLocationClick();
    handleSubmitLocation();
}

/*
    Searches for wildlife
*/
function wildlifeSearch() {
    // The number of observations returned by the iNaturalist API per page of observations
    const wildlifePerPage = 200;

    let allDisplayData = [];

    /*
        Display the API data to the DOM
    */
    function displayData() {    
        // Remove any previous search results from the DOM
        $(".wildlife-result").remove();

        for(let singleData of allDisplayData) {
            let displayedPhotos = "";
            for(let photoUrl of singleData.photoUrls) {
                const img = `<img src="${photoUrl}" alt="${singleData.name}" class="organism-photo">`;
                displayedPhotos = displayedPhotos + img;
            }
            $(".wildlife-results").append(`
            <section class="wildlife-result">
                <section>
                    ${displayedPhotos}
                </section>

                <h3>${singleData.name}</h3>
                <p>${singleData.wikiIntro}</p>
                <a href="${singleData.wikiUrl}" target="_blank">${singleData.wikiUrl}</a>
            </section>
            `);
        }

        if(allDisplayData.length === 0) {
            $(".wildlife-results").append(`
            <p>No wildlife found</p>
            `);
        }

        // Remove searching message from page
        $(".searching").addClass("hidden");

        // Show the search results
        $(".wildlife-results").removeClass("hidden");

        // Reset the search data
        allDisplayData = [];
    }

    /*
        Convert the provided photo URL into a URL that points to a larger photo
    */
    function createNewPhotoUrl(originalUrl) {
        return originalUrl.replace("/square.jp", "/small.jp");
    }

    /*
        Find and return photo URLs for the provided observation
    */
    function getPhotoUrls(observation) {
        const photoUrls = [];
        const observationPhotosJson = observation.photos;
        observationPhotosJson.forEach(photoJson => {
            const originalUrl = photoJson.url;
            // The photo in the response data is way too small. This method constructs a URL pointing to a larger photo
            const desiredUrl = createNewPhotoUrl(originalUrl);
            photoUrls.push(desiredUrl);
        });

        return photoUrls;
    }

    /*
        Pull the page title from the organism's wikipedia URL
    */
    function getPageTitle(organismData) {
        const url = organismData.wikiUrl;
        
        return url.split("/").pop();
    }

    /*
        Break up the provided array into separate arrays of the provided length.  The provided array is not modified.
    */
    function breakUpArray(arr, subLength) {
        const quotient = Math.floor(arr.length / subLength);
        const remainder = arr.length % subLength;
        const brokenUpArrays = [];

        for(let i = 0; i < quotient; i++) {
            const startIndex = i * subLength;
            const endIndex = startIndex + subLength;
            brokenUpArrays.push(arr.slice(startIndex, endIndex));
        }

        // Store the remainder arrays
        brokenUpArrays.push(arr.slice(-remainder));

        return brokenUpArrays;
    }

    /*
        Fetch the Wikipedia data, then call the display function
    */
    function getWikipediaData() {
        const baseUrl = "https://en.wikipedia.org/w/api.php";
        const params = {
            action: "query",
            prop: "extracts",
            exintro: "true",
            titles: "",
            explaintext: "1",
            formatversion: "2",
            format: "json",
            origin: "*"
        }

        const errorDescription = "Something went wrong while fetching the Wikipedia data";

        const promises = [];
        
        // Break up the display data into groups of 20, to make fewer calls to the MediaWiki API
        const displayDataGroups = breakUpArray(allDisplayData, 20);
        
        // Loop through each group of organisms in the display data
        for(const displayDataGroup of displayDataGroups) {
            // Combine all the organism's Wikipedia URLs into page titles separated by "|"
            const pageTitles = [];
            for(const organismData of displayDataGroup) {
                pageTitles.push(getPageTitle(organismData));
            }
            params.titles = pageTitles.join("|");

            const queryParams = formatQueryParams(params);
            const url = baseUrl + "?" + queryParams;
            
            console.log(`Fetching data from URL: ${url}`);
            promises.push(fetchJson(url, errorDescription));
        }

        return Promise.all(promises);
    }

    /*
        Remove invalid data from the HTTP Response JSON
    */
    function filterWildlifeData(wildlifeJson) {
        for(let observation of wildlifeJson.results) {
            const organism = observation.taxon;

            // Ignore wildlife data that doesn't have a wikipedia URL, for now
            if (organism.wikipedia_url != null) {
                const foundData = allDisplayData.find(element => element.name === organism.preferred_common_name);

                // If the organism has already been stored, add this observation's pictures to that organism's data
                if(foundData != undefined) {
                    foundData.photoUrls = foundData.photoUrls.concat(getPhotoUrls(observation));
                }
                else {
                    const organismData = {};

                    /*
                        Store the preferred common name if the observation has it, otherwise store the organism's scientific name
                    */
                    if(typeof organism.preferred_common_name !== "undefined") {
                        organismData.name = organism.preferred_common_name;
                    }
                    else {
                        organismData.name = organism.name;
                    }
                    
                    organismData.photoUrls = getPhotoUrls(observation);
                    organismData.wikiUrl = organism.wikipedia_url;

                    allDisplayData.push(organismData);
                }
            }
            else {
                console.log(`No wikipedia link for ${organism.preferred_common_name}`);
            }
        }
    }

    /*
        Convert the wildlife types to the parameters expected by the iNaturalist API
    */
    function convertWildlifeTypesToTaxa(wildlifeTypes) {
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
        Fetch a page of wildlife data from the iNaturalist API
    */
    function getPageOfWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate, page=1) {
        const baseUrl = "https://api.inaturalist.org/v1/observations";

        const params = {
            lat: latitude,
            lng: longitude,
            radius: radius,
            iconic_taxa: iconicTaxa,
            taxon_name: name,
            d1: startDate,
            d2: endDate,
            photos: "true",
            order_by: "species_guess",
            page: page.toString(),
            per_page: wildlifePerPage.toString()
        }
        const queryParams = formatQueryParams(params);
        
        const url = baseUrl + "?" + queryParams;

        const errorDescription = `Something went wrong while fetching page ${page} of the wildlife data`;
        console.log(`Fetching data from URL: ${url}`);
        return fetchJson(url, errorDescription);
    }

    /*
        Fetch pages of wildlife data, filtering out results from each set, until all results are collected
    */
    async function getAllWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate) {
        let page = 1;
        let numOrganismsThisPage = 0;

        // Loop through all pages of wildlife data
        while(true) {
            await getPageOfWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate, page)
            .then(wildlifeJson => {
                console.log(`----------Wildlife Page ${page} Data----------`);
                console.log(wildlifeJson);
                console.log("");

                numOrganismsThisPage = wildlifeJson.results.length;
                
                filterWildlifeData(wildlifeJson);
            })
            .catch(handleFetchError);

            // If the HTTP Response doesn't have enough observations to meet its page limit, then all following pages of observations will be empty.
            if(numOrganismsThisPage < wildlifePerPage) {
                break;
            }

            page++;
        }
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
        $(".search-form.wildlife-form").submit(event => {
            event.preventDefault();

            // Hide the search results section from the page
            $(".wildlife-results").addClass("hidden");

            // Clear any previous errors
            $(".wildlife-error").text("");

            if($("#found-location").val() === "") {
                console.log("Error: No location was provided before beginning the wildlife search");
                $(".wildlife-error").text("Error: You must find a location before searching for wildlife");
                $(".wildlife-results").removeClass("hidden");
            }
            else {
                // Tell the user the search is running
                $(".searching").removeClass("hidden");

                // Grab the user input
                const locationCoordinates = $("#found-location").val();
                const latitude = locationCoordinates.split(",")[0];
                const longitude = locationCoordinates.split(",")[1];

                const wildlifeTypes = getWildlifeTypes();
                const iconicTaxa = convertWildlifeTypesToTaxa(wildlifeTypes);

                const radius = $("#search-radius").val();
                const name = $("#organism-name").val();
                const startDate = $("#search-start").val();
                const endDate = $("#search-end").val();

                getAllWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate)
                .then(getWikipediaData)
                .then(promiseResults => {
                    console.log(`----------Wikipedia Intros Found----------`);
                    // Loop through each MediaWiki Response
                    for(let resultCount = 0; resultCount < promiseResults.length; resultCount++) {
                        const wikipediaJson = promiseResults[resultCount];
                        console.log(wikipediaJson);

                        // Each MediaWiki Response has 20 Wikipedia pages in it (except the last one, which may have fewer)
                        const pageBracket = resultCount * 20;

                        // Store the page intro that corresponds to each organism in the page bracket
                        const wikipediaPages = wikipediaJson.query.pages;
                        for(let i = 0; i < wikipediaPages.length; i++) {
                            // Grab the ith organism of the current page bracket
                            const organismData = allDisplayData[pageBracket + i];
                            
                            // Grab the organism's page title and add spaces back into it, so it matches the format of the JSON page titles
                            const organismPageTitle = getPageTitle(organismData).replace(/_/g, " ");
        
                            organismData.wikiIntro = wikipediaPages.find(element => element.title === organismPageTitle).extract;
                        }
                    }
            
                    console.log("Display data:");
                    console.log(allDisplayData);
                })
                .catch(handleFetchError)
                .then(displayData);
            }
        });
    }

    handleSearchSubmit();
}

/*
    Change the page displayed in the app when a user clicks particular buttons
*/
function loadPages() {
    /*
        Handle loading the Start page when the New Search button is clicked
    */
    function handleNewSearchButtonClick() {
        $(".search-button").click(event => {
            switchToPage("search-page");
        })
    }
    
    /*
        Display the provided page, and hide all other pages
    */
    function switchToPage(pageClass) {
        const displayingPage = $(`article.${pageClass}`);
        displayingPage.removeClass("hidden");
        displayingPage.siblings("article").addClass("hidden");
    }

    /*
        Handle loading the About page when the About button is clicked
    */
    function handleAboutButtonClick() {
        $(".about-button").click(event => {
            switchToPage("about-page");
        });
    }

    handleAboutButtonClick();
    handleNewSearchButtonClick();
}

$(function() {
    MicroModal.init();
    locationSearch();
    wildlifeSearch();
    loadPages();
});