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

    // The number of observations returned by the iNaturalist API per page of observations
    const wildlifePerPage = 200;

    let allDisplayData = [];

    /*
        Display the API data to the DOM
    */
    function displayData() {    
        // Remove any previous search results from the DOM
        $(".search-result").remove();

        for(let singleData of allDisplayData) {
            let displayedPhotos = "";
            for(let photoUrl of singleData.photoUrls) {
                const img = `<img src="${photoUrl}" alt="${singleData.name}" class="organism-photo">`;
                displayedPhotos = displayedPhotos + img;
            }
            $(".search-results").append(`
            <section class="search-result">
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
            $(".search-results").append(`
            <p>No wildlife found</p>
            `);
        }

        // Remove searching message from page
        $(".searching").addClass("hidden");

        // Show the search results
        $(".search-results").removeClass("hidden");

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
        Fetch a page of wildlife data from the iNaturalist API
    */
    function getPageOfWildlifeData(coordinates, page=1) {
        const baseUrl = "https://api.inaturalist.org/v1/observations";

        const iconicTaxa = convertWildlifeTypesToTaxa();

        const latitude = coordinates.latitude;
        const longitude = coordinates.longitude;

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
    async function getAllWildlifeData(coordinates) {
        let page = 1;
        let numOrganismsThisPage = 0;

        // Loop through all pages of wildlife data
        while(true) {
            await getPageOfWildlifeData(coordinates, page)
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
                throw Error(`${errorDescription}: ${reponse.statusText}`);
            }
        });
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

        const errorDescription = "Something went wrong when fetching the latitude and longitude coordinates";
        return fetchJson(url, errorDescription);
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

            // Hide the search results section from the page
            $(".search-results").addClass("hidden");

            // Tell the user the search is running
            $(".searching").removeClass("hidden");

            // Grab the user input
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

            getLatLonCoordinates()
            .then(coordinatesJson => {
                console.log("----------Coordinates found for the provided address----------");
                console.log(coordinatesJson);
    
                // For now just grab the coordinates of the first location in the response
                return {
                    "latitude": coordinatesJson[0].lat, 
                    "longitude": coordinatesJson[0].lon
                };
            })
            .catch(handleFetchError)
            .then(getAllWildlifeData)
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
    wildlifeSearch();
    loadPages();
});