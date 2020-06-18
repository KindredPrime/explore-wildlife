"use strict";

/*
    Set default values for the "Start Date" and "End Date" fields
*/
function setDefaultDates() {
    /*
        Return the day of the month of the provided date as a two-digit number

        Example:
            First day of month = "01"
    */
    function getTwoDigitDay(date) {
        return date.getDate().toString().padStart(2, "0");
    }

    /*
        Return the month of the provided date as a two-digit number

        Example:
            January = "01"
    */
    function getTwoDigitMonth(date) {
        return (date.getMonth() + 1).toString().padStart(2, "0")
    }

    /*
        Set the start date default to one year ago
    */
    function setStartDate() {
        const lastYearDate = new Date();
        const lastYear = lastYearDate.getFullYear() - 1;
        lastYearDate.setFullYear(lastYear);
        const month = getTwoDigitMonth(lastYearDate);
        const day = getTwoDigitDay(lastYearDate);

        $("#search-start").val(`${lastYear}-${month}-${day}`);
    }

    /*
        Set the end date default to the current date
    */
    function setEndDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = getTwoDigitMonth(today);
        const day = getTwoDigitDay(today);

        // YYYY-MM-DD
        $("#search-end").val(`${year}-${month}-${day}`);
    }

    setStartDate();
    setEndDate();
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
    Fetch JSON data from the provided URL
*/
function fetchJson(url) {
    return fetch(url).then(response => {
        if(response.ok) {
            return response.json();
        }
        else {
            throw Error(response.statusText);
        }
    });
}

/*
    Help the user pick a address to search for wildlife around
*/
function addressSearch() {
    const locationIQKey = "c8f4ef91fa2470";
    const commonAddressComponents = [
        "country",
        "state",
        "county",
        "postcode",
        "city",
        "road"
    ];
    const minimumCommonComponents = 4;
    let fetchReturnedAddresses = false;

    // LocationIQ element that represents the likelihood the returned address matches its search parameters.  Ordered from greatest likelihood to least likelihood
    const matchCodes = [
        "exact",
        "fallback",
        "approximate"
    ];

    // LocationIQ element that represents the granularity of the returned address.  Ordered from most granular to least granular.
    const matchLevels = [
        "venue",
        "building",
        "street",
        "neighbourhood",
        "island",
        "borough",
        "city",
        "county",
        "state",
        "country",
        "marine",
        "postalcode"
    ];

    /*
        Handle all errors that occur
    */
    function handleError(error) {
        const errorMessage = `An error occurred while finding addresses: ${error.message}`;
        console.log(errorMessage);
        $(".find-addresses-status").text(errorMessage);
        MicroModal.show("addresses-modal");
    }

    function formatAddressComponent(component) {
        let formattedComponent = component.replace(/[-_]/g, " ");

        // Capitalize the first letter of each word
        const componentWords = formattedComponent.toLowerCase().split(" ");
        formattedComponent = componentWords.map(word => {
            return word.charAt(0).toUpperCase() + word.substring(1)
        }).join(' ');
        
        return formattedComponent;
    }

    /*
        Convert the provided address to a string
    */
    function convertAddressToHtml(address) {
        const commonComponents = address.common;
        const uncommonComponents = address.uncommon;
        let htmlParts = [];

        /*
            Convert common components to HTML
        */
        htmlParts.push(`Country: ${address.common.country}`);
        if(commonComponents.state != undefined) {
            htmlParts.push(`<span class="address-component">State: ${commonComponents.state}</span>`);
        }
        if(commonComponents.county != undefined) {
            htmlParts.push(`<span class="address-component">County: ${commonComponents.county}</span>`);
        }
        if(commonComponents.postcode != undefined) {
            htmlParts.push(`<span class="address-component">Postal Code: ${commonComponents.postcode}</span>`);
        }
        if(commonComponents.city != undefined) {
            htmlParts.push(`<span class="address-component">City: ${commonComponents.city}</span>`);
        }
        if(commonComponents.road != undefined) {
            htmlParts.push(`<span class="address-component">Road: ${commonComponents.road}</span>`);
        }
        
        // Convert common components to HTML if there aren't enough common components to display
        if(commonComponents.length < minimumCommonComponents) {
            for(const uncommonComponent in uncommonComponents) {
                // Format the component to display cleanly
                let formattedComponent = formatAddressComponent(uncommonComponent);
                htmlParts.push(`<span class="address-component">${formattedComponent}: ${uncommonComponents[uncommonComponent]}</span>`);
            }
        }

        return htmlParts.join("");
    }

    /*
        Display the provided addresses in the found addresses modal
    */
    function displayAddresses(addressOptions) {
        console.log(`Display data:`);
        console.log(addressOptions);
        console.log("");

        // Display each of the address options
        if(addressOptions.length > 0) {
            for(const addressOption of addressOptions) {
                const htmlElements = [];
                const radioInput = `<input type="radio" id="${addressOption.placeId}" class="address-option" name="address" value="${addressOption.lat},${addressOption.lon}">`;
                htmlElements.push(radioInput);

                let addressAsText = convertAddressToHtml(addressOption.addressComponents);
                const labelTag = `
                <label for="${addressOption.placeId}" class="address-option-label">
                    ${addressAsText}
                </label>
                `;
                htmlElements.push(labelTag);

                // Also include a break tag
                htmlElements.push("<br>");

                const htmlContent = htmlElements.join("\n");
                $(".addresses-results").append(htmlContent);
            }

            // Set the address options to be required
            $(".address-option").first().attr("required", true);

            // Create the submit button
            $(".addresses-results").append(`
            <button type="submit" class="submit-button address-submit">
                Submit Selected Address
            </button>
            `);
        }
        // Either the fetch didn't return any addresses, or all of the returned addresses were invalid
        else {
            const message = "No addresses were found";
            console.log(message);
            $(".find-addresses-status").text(message);
        }
            
        // Remove "Searching..." message
        $(".find-address").text("Find Address");

        MicroModal.show("addresses-modal");
    }

    /*
        Find the best address of the provided addresses
    */
    function getBestAddress(addresses) {
        // Keep only the addresses with the best match code
        // I haven't found any test data with duplicate addresses that have different match codes.  Until I find any such data, there's no need to compare match codes

        // Keep only the addresses with the most granular match level
        // I haven't found any test data with duplicate addresses that have different match levels.  Until I find any such data, there's no need to compare match levels
        
        // If there are still multiple addresses left, then they're equal-enough; return the first one
        return addresses[0];
    }

    /*
        Return a new array with the following: From each set of addresses that have identical common address components, remove all addresses except for the best address
    */
    function removeDuplicates(allAddressData) {
        const uniqueAddressData = [];
        for(const addressData of allAddressData) {
            // Check if an equivalent address option already exists in the filtered array
            const existingDataIndex = uniqueAddressData.findIndex(data => {
                return _.isEqual(data.addressComponents.common, addressData.addressComponents.common);
            });

            // Found a duplicate address
            if(existingDataIndex > -1) {
                const existingData = uniqueAddressData[existingDataIndex];
                console.log(`Address ${addressData.placeId} has an identical match: address ${existingData.placeId}`);

                // Keep the better of the two addresses
                const bestAddress = getBestAddress([addressData, existingData]);
                console.log(`----Chosen address: ${bestAddress.placeId}`);
                uniqueAddressData[existingDataIndex] = bestAddress;
            }
            // Not a duplicate address
            else {
                uniqueAddressData.push(addressData);
            }
        }

        return uniqueAddressData;
    }

    /*
        Return an object containing the uncommon address components of the provided components
    */
    function getUncommonComponents(addressComponents) {
        const returningComponents = {};
        for(const component in addressComponents) {
            if(!commonAddressComponents.includes(component)) {
                returningComponents[component] = addressComponents[component];
            }
        }

        return returningComponents;
    }

    /*
        Return an object containing the common address components of the provided components
    */
    function getCommonComponents(addressComponents) {
        const returningComponents = {};
        for(const component in addressComponents) {
            if(commonAddressComponents.includes(component)) {
                returningComponents[component] = addressComponents[component];
            }
        }

        return returningComponents;
    }

    /*
        Return true if the provided address refers to an area that is too large
    */
    function addressIsTooLarge(addressJson) {
        // island, borough, city, county, state, country, marine, postalcode
        const unacceptableMatchLevels = matchLevels.slice(-8);

        // The match level is a LocationIQ API property that represents the granularity of the address
        const matchLevel = addressJson.matchquality.matchlevel;
        if(unacceptableMatchLevels.includes(matchLevel)) {
            return true;
        }

        return false;
    }

    /*
        Return true if the provided address is unlikely to match the search parameters
    */
    function addressIsUnlikely(addressJson) {
        // approximate
        const unacceptableMatchCodes = matchCodes.slice(-1);

        // The match code is a LocationIQ API property that represents the likelihood the returned address matches its search parameters
        const matchCode = addressJson.matchquality.matchcode;
        if(unacceptableMatchCodes.includes(matchCode)) {
            return true;
        }

        return false;
    }

    /*
        Return true if the provided address passes all the tests
    */
    function addressIsValid(addressJson) {
        // Fail the address if it's missing a country
        if(addressJson.address.country == undefined) {
            console.log(`Address ${addressJson.place_id} is missing its country`);
            return false;
        }

        // Fail the address if its probability of matching the search parameters is too low
        if(addressIsUnlikely(addressJson)) {
            console.log(`Address ${addressJson.place_id} is unlikely to match the user's search parameters`);
            return false;
        }

        if(addressIsTooLarge(addressJson)) {
            console.log(`Address ${addressJson.place_id} refers to an area that is too large`);
            return false;
        }

        return true;
    }

    /*
        Return an array containing the relevant data from each of the provided addresses that are valid
    */
    function getRelevantAddressData(addressesJson) {
        const relevantData = [];

        // Iterate through the returned address options
        if(fetchReturnedAddresses)
        {
            for(const addressJson of addressesJson) {
                if(addressIsValid(addressJson)) {
                    const addressOption = {};

                    // Make a copy of the addressJson's address object
                    const addressComponentsCopy = {};
                    Object.assign(addressComponentsCopy, addressJson.address);

                    // Remove extra address component fields
                    if(addressComponentsCopy.country_code != undefined) {
                        delete addressComponentsCopy.country_code;
                    }

                    const commonComponents = getCommonComponents(addressComponentsCopy);
                    const uncommonComponents = getUncommonComponents(addressComponentsCopy);
                    addressOption.addressComponents = {
                        common: commonComponents,
                        uncommon: uncommonComponents
                    };
                    
                    addressOption.lat = addressJson.lat;
                    addressOption.lon = addressJson.lon;
                    addressOption.placeId = addressJson.place_id;

                    relevantData.push(addressOption);
                }
            }
        }

        return relevantData;
    }

    /*
        Return true if enough of the provided address fields are populated
    */
    function enoughFieldsArePopulated(fieldsObject) {
        if(fieldsObject.street != "") {
            return true;
        }
        else {
            return false;
        }
    }

    /*
        Fetch JSON address data from the provided LocationIQ URL, handle if no addresses are returned, and handle if some other problem occurs with the request
    */
    function fetchCoordinatesJson(url) {
        return fetch(url).then(response => {
            if(response.ok) {
                fetchReturnedAddresses = true;
                return response.json();
            }
            // No addresses were returned
            else if(response.status === 404){
                return response.json();
            }
            else {
                throw Error(response.statusText);
            }
        });
    }

    /*
        Use the LocationIQ API to convert the provided address into latitude and longitude coordinates, then fetch the wildlife data
    */
    function getLatLonCoordinates(address) {
        const baseUrl = "https://us1.locationiq.com/v1/search.php";
        const params = {
            key: locationIQKey,
            street: address.street,
            city: address.city,
            county: address.county,
            state: address.state,
            country: address.country,
            postalCode: address.postalCode,
            format: "json",
            normalizecity: "1",
            addressdetails: "1",
            matchquality: "1",
            limit: "50"
        };
        const queryParams = formatQueryParams(params);
        const url = baseUrl + "?" + queryParams;
        console.log(`Fetching data from: ${url}`);
        console.log("");

        return fetchCoordinatesJson(url);
    }

    /*
        Reset all variables and DOM elements that are left over from previous address searches
    */
    function resetEnvironment() {
        fetchReturnedAddresses = false;

        // Clear previous errors
        $(".find-addresses-status").text("");

        // Clear previous addresses results
        $(".addresses-results").empty();
    }

    /*
        Create an event listener for when the "Find Address" button is clicked
    */
    function handleFindAddressClick() {
        $(".find-address").click(event => {
            event.preventDefault();

            resetEnvironment();

            // Grab user input
            const userAddress = {};
            userAddress.street = $("#search-street").val();
            userAddress.city = $("#search-city").val();
            userAddress.county = $("#search-county").val();
            userAddress.postalCode = $("#search-postal-code").val();

            userAddress.country = $("#search-country").val();
            if(userAddress.country === "United States of America") {
                userAddress.state = $("#search-state").val();
            }
            else { // Ignore the "US State or Territory" field if the country isn't the United States of America
                userAddress.state = "";
            }

            console.log("User-provided address: ");
            console.log(userAddress);
            console.log("");
            
            if(enoughFieldsArePopulated(userAddress)) {
                // Tell the user the search is running
                $(".find-address").text("Searching...");

                getLatLonCoordinates(userAddress)
                .then(addressesJson => {
                    console.log("----------Addresses found using the provided address components----------");
                    console.log(addressesJson);
                    console.log("");

                    const allAddressData = getRelevantAddressData(addressesJson);
                    const uniqueAddressData = removeDuplicates(allAddressData);
                    return uniqueAddressData;
                })
                .then(displayAddresses)
                .catch(handleError);
            }
            else {
                $(".find-addresses-status").text('You must fill out the "Street Name" field.');
                console.log(`Error while finding address: The "Street Name" field wasn't filled out.`);
                MicroModal.show("addresses-modal");
            }
        });
    }

    /*
        Enable the user to fill out the wildlife search form
    */
    function enableWildlifeSearch() {
        // Enable all form elements in the wildlife search except for the "Found Address" field
        $(".wildlife-form *:disabled").not("#found-address").removeAttr("disabled");
    }

    /*
        Create an event listener for when the address is submitted from the modal
    */
    function handleSubmitAddress() {
        $(".addresses-results").submit(event => {
            event.preventDefault();
           
            // Get the selected coordinates
            const coordinates = $(".addresses-results input[name='address']:checked").val();
            console.log(`Selected coordinates: ${coordinates}`);

            // Store the selected coordinates in the "Found Address" field
            $("#found-address").val(coordinates);

            // Close the modal
            MicroModal.close("addresses-modal");

            // Enable the wildlife search form
            enableWildlifeSearch();
        });
    }

    handleFindAddressClick();
    handleSubmitAddress();
}

/*
    Searches for wildlife
*/
function wildlifeSearch() {
    // The number of observations returned by the iNaturalist API per page of observations
    const wildlifePerPage = 200;

    /*
        Handle all errors that occur
    */
    function handleError(error) {
        const errorMessage = `An error occurred while searching for wildlife: ${error.message}`;
        console.log(errorMessage);
        $(".wildlife-status").text(errorMessage);
    }

    /*
        Display the wildlife data to the DOM
    */
    function displayData(data) {
        console.log("Wildlife data:");
        console.log(data);

        if(data.length === 0) {
            $(".wildlife-status").text("No wildlife observations found");
        }
        else {
            for(const organism of data) {
                const photos = [];
                for(const sighting of organism.sightings) {
                    for(const photoUrl of sighting.photoUrls) {
                        const photo = {};
                        photo.img = `<img src="${photoUrl}" alt="${organism.name}">`;
                        photo.caption = `<p>Observed by iNaturalist user ${sighting.observer} on ${sighting.date}</p>`;
                        photos.push(photo);
                    }
                }

                // Convert the photos to HTML
                const photosAsHtml = photos.map(photo => {
                    return `
                    <div class="organism-photo">
                        ${photo.img}
                        ${photo.caption}
                    </div>
                    `;
                }).join("\n");

                $(".wildlife-results").append(`
                <section class="wildlife-result">
                    <section class="sightings">
                        ${photosAsHtml}
                    </section>

                    <h3>${organism.name}</h3>
                    <p>${organism.wikiIntro}</p>
                    <a href="${organism.wikiUrl}" target="_blank">${organism.wikiUrl}</a>
                </section>
                `);
            }
        }
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
        Return the page title of the provided Wikipedia URL
    */
    function getPageTitle(wikiUrl) {
        return wikiUrl.split("/").pop();
    }

    /*
        Break up the provided array into separate arrays of the provided length.  The provided array is not modified.
    */
    function breakUpArray(arr, subLength) {
        const brokenUpArrays = [];

        if(arr.length > 0) {
            const quotient = Math.floor(arr.length / subLength);
            const remainder = arr.length % subLength;
    
            for(let i = 0; i < quotient; i++) {
                const startIndex = i * subLength;
                const endIndex = startIndex + subLength;
                brokenUpArrays.push(arr.slice(startIndex, endIndex));
            }
    
            // Store the remainder arrays
            brokenUpArrays.push(arr.slice(-remainder));
        }

        return brokenUpArrays;
    }

    /*
        Fetch the intro sections from each of the provided Wikipedia URLs
    */
    function getWikipediaData(wikiUrls) {
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

        const promises = [];
        
        // Break up the URLs into groups of 20, to make fewer calls to the MediaWiki API
        const wikiUrlGroups = breakUpArray(wikiUrls, 20);
        
        for(const wikiUrlGroup of wikiUrlGroups) {
            // Combine all the URLs in this group into page titles separated by "|"
            const pageTitles = [];
            for(const wikiUrl of wikiUrlGroup) {
                const pageTitle = getPageTitle(wikiUrl);
                pageTitles.push(pageTitle);
            }
            params.titles = pageTitles.join("|");

            const queryParams = formatQueryParams(params);
            const url = baseUrl + "?" + queryParams;
            
            console.log(`Fetching data from URL: ${url}`);
            promises.push(fetchJson(url));
        }

        return Promise.all(promises);
    }

    /*
        Return a new array that merges all the duplicate organisms from the provided display data
    */
    function mergeDuplicateOrganismData(allDisplayData) {
        const mergedDuplicates = [];
        for(const organismData of allDisplayData) {
            const existingData = mergedDuplicates.find(element => element.name === organismData.name);

            // Add organismData's sightings to the existing sightings of that organism in mergedDuplicates
            if(existingData != undefined) {
                existingData.sightings.push(...organismData.sightings);
            }
            else {// Not a duplicate organism; add all of its data to the mergedDuplicates array
                mergedDuplicates.push(organismData)
            }
        }

        return mergedDuplicates;
    }

    /*
        Return the sighting data of the provided iNaturalist API observation
    */
    function getSightingData(iNatObservation) {
        const sighting = {};
        sighting.photoUrls = getPhotoUrls(iNatObservation);
        sighting.date = iNatObservation.observed_on;
        sighting.observer = iNatObservation.user.login;
        return sighting;
    }

    /*
        Return the useful data from the HTTP Response JSON
    */
    function getRelevantData(wildlifeJson) {
        const relevantData = [];

        for(let iNatObservation of wildlifeJson.results) {
            const organism = iNatObservation.taxon;

            // Ignore wildlife data that doesn't have a wikipedia URL
            if (organism.wikipedia_url != null) {
                const organismData = {};

                /*
                    Store the preferred common name if the iNaturalist observation has it, otherwise store the organism's scientific name
                */
                if(typeof organism.preferred_common_name !== "undefined") {
                    organismData.name = organism.preferred_common_name;
                }
                else {
                    organismData.name = organism.name;
                }
                
                organismData.sightings = [];
                const sighting = getSightingData(iNatObservation);
                organismData.sightings.push(sighting);

                organismData.wikiUrl = organism.wikipedia_url;

                relevantData.push(organismData);
            }
            else {
                console.log(`No wikipedia link for ${organism.preferred_common_name}`);
            }
        }

        return relevantData;
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
        console.log(`Fetching data from URL: ${url}`);
        return fetchJson(url);
    }

    /*
        Fetch pages of wildlife data, filtering out results from each set, until all results are collected
    */
    async function getAllWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate) {
        let page = 1;
        let numOrganismsThisPage = 0;
        const allDisplayData = [];

        // Loop through all pages of wildlife data
        while(true) {
            await getPageOfWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate, page)
            .then(wildlifeJson => {
                console.log(`----------Wildlife Page ${page} Data----------`);
                console.log(wildlifeJson);
                console.log("");

                numOrganismsThisPage = wildlifeJson.results.length;
                
                const newDisplayData = getRelevantData(wildlifeJson);
                allDisplayData.push(...newDisplayData);
            })
            .catch(handleError);

            // If the HTTP Response doesn't have enough observations to meet its page limit, then all following pages of observations will be empty.
            if(numOrganismsThisPage < wildlifePerPage) {
                break;
            }

            page++;
        }

        const mergedDuplicates = mergeDuplicateOrganismData(allDisplayData);
        return mergedDuplicates;
    }

    /*
        Convert the HTML date string into a Date object
    */
    function parseDate(dateString) {
        // yyyy-mm-dd
        const dateComponents = dateString.split("-");
        const year = dateComponents[0];
        // For Date objects, January="0", not "1"
        const month = dateComponents[1] - 1;
        const day = dateComponents[2];

        return new Date(year, month, day);
    }

    /*
        Update DOM to reflect the search results
    */
    function endSearch() {
        // Remove searching message from page
        $(".searching").addClass("hidden");
            
        $(".wildlife-results").removeClass("hidden");
    }

    /*
        Return true if the provided dates pass all tests
    */
    function testDates(startString, endString) {
        // Convert the strings into Date objects
        const startDate = parseDate(startString);
        const endDate = parseDate(endString);
        const currentDate = new Date();

        // Fail if either date is in the future
        if(startDate > currentDate || endDate > currentDate) {
            console.log(`Error: The user entered a future date.`);
            console.log("");
            $(".wildlife-status").text(`Unable to search: You cannot use future dates for your search.`);

            return false;
        }
        // Fail if the start date is after the end date
        else if(startDate > endDate) {
            console.log("Error: The user entered a start date that was after the end date.");
            console.log("");
            $(".wildlife-status").text("Unable to search: Your start date cannot be after your end date.");

            return false;
        }

        return true;
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

            // Clear any previous search results
            $(".wildlife-result").remove();

            // Clear any previous errors
            $(".wildlife-status").text("");
            
            // Tell the user the search is running
            $(".searching").removeClass("hidden");

            // Grab the user input
            const addressCoordinates = $("#found-address").val();
            const latitude = addressCoordinates.split(",")[0];
            const longitude = addressCoordinates.split(",")[1];

            const wildlifeTypes = getWildlifeTypes();
            const iconicTaxa = convertWildlifeTypesToTaxa(wildlifeTypes);

            const radius = $("#search-radius").val();
            const name = $("#organism-name").val();
            const startDate = $("#search-start").val();
            const endDate = $("#search-end").val();

            const datesAreValid = testDates(startDate, endDate);
            if(datesAreValid) {
                let allDisplayData = [];

                getAllWildlifeData(latitude, longitude, radius, iconicTaxa, name, startDate, endDate)
                .then(filteredData => {
                    allDisplayData = filteredData;
    
                    // Create an array of just the Wikipedia URLs
                    return allDisplayData.map(data => data.wikiUrl);
                })
                .then(getWikipediaData)
                .then(promiseResults => {
                    console.log(`----------Wikipedia Intros Found----------`);
                    // Loop through each MediaWiki Response
                    for(let resultCount = 0; resultCount < promiseResults.length; resultCount++) {
                        const wikipediaJson = promiseResults[resultCount];
                        console.log(wikipediaJson);
                        console.log("");
    
                        // Each MediaWiki Response has 20 Wikipedia pages in it (except the last one, which may have fewer)
                        const pageBracket = resultCount * 20;
    
                        // Store the page intro that corresponds to each organism in the page bracket
                        const wikipediaPages = wikipediaJson.query.pages;
                        for(let i = 0; i < wikipediaPages.length; i++) {
                            // Grab the ith organism of the current page bracket
                            const organismData = allDisplayData[pageBracket + i];
                            
                            // Grab the organism's page title and add spaces back into it, so it matches the format of the JSON page titles
                            const wikiUrl = organismData.wikiUrl;
                            const organismPageTitle = getPageTitle(wikiUrl).replace(/_/g, " ");
        
                            organismData.wikiIntro = wikipediaPages.find(element => element.title === organismPageTitle).extract;
                        }
                    }
    
                    return allDisplayData;
                })
                .then(displayData)
                .catch(handleError)
                .finally(endSearch);
            }
            else {
                endSearch();
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
    setDefaultDates();
    addressSearch();
    wildlifeSearch();
    loadPages();
});