"use strict";

/**
 * Set default values for the "Start Date" and "End Date" fields
 */
function setDefaultDates() {
    /**
     * Return the day of the month of the provided date as a two-digit number
     * Example:
     *      First day of month = "01"
     */
    function getTwoDigitDay(date) {
        return date.getDate().toString().padStart(2, "0");
    }

    /**
     * Return the month of the provided date as a two-digit number
     * Example:
     *      January = "01"
     */
    function getTwoDigitMonth(date) {
        return (date.getMonth() + 1).toString().padStart(2, "0");
    }

    /**
     * Set the start date default to one year ago
     */
    function setStartDate() {
        const lastYearDate = new Date();
        const lastYear = lastYearDate.getFullYear() - 1;
        lastYearDate.setFullYear(lastYear);
        const month = getTwoDigitMonth(lastYearDate);
        const day = getTwoDigitDay(lastYearDate);

        $("#search-start").val(`${lastYear}-${month}-${day}`);
    }

    /**
     * Set the end date default to the current date
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

/**
 * Convert the provided parameters into an HTTP-friendly format
 */
function formatQueryParams(params) {
    const populatedParams = Object.keys(params)
        .filter((key) => params[key].length > 0);

    const queryItems = populatedParams
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    return queryItems.join("&");
}

/**
 * Fetch JSON data from the provided URL
 */
function fetchJson(url) {
    return fetch(url).then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            throw Error(response.statusText);
        }
    });
}

/**
 * Help the user pick a address to search for wildlife around
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

    /**
     * LocationIQ element that represents the likelihood the returned address
     * matches its search parameters.  Ordered from greatest likelihood to
     * least likelihood
     */
    const matchCodes = [
        "exact",
        "fallback",
        "approximate"
    ];

    /**
     * LocationIQ element that represents the granularity of the returned
     * address.  Ordered from most granular to least granular.
     */
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

    /**
     * Update DOM elements to reflect the search for addresses has ended
     */
    function endSearch() {
        MicroModal.show("addresses-modal");

        // Remove "Searching..." message
        $(".find-address").text("Find Address");

        $(".find-address").prop("disabled", false);
    }

    /**
     * Handle the provided error
     */
    function handleError(error) {
        const errorMessage = `An error occurred while finding addresses: ${error.message}`;
        console.log(errorMessage);
        $(".find-addresses-status").text(errorMessage);
        MicroModal.show("addresses-modal");
    }

    /**
     * Convert the provided address component to a readable format
     */
    function formatAddressComponent(component) {
        let formattedComponent = component.replace(/[-_]/g, " ");

        // Capitalize the first letter of each word
        const componentWords = formattedComponent.toLowerCase().split(" ");
        formattedComponent = componentWords.map((word) => {
            return word.charAt(0).toUpperCase() + word.substring(1);
        }).join(' ');

        return formattedComponent;
    }

    /**
     * Convert the provided address components to a string
     */
    function convertAddressToHTML({common, uncommon}) {
        let htmlParts = [];

        // Convert common components to HTML
        htmlParts.push(`Country: ${common.country}`);
        if (common.state != undefined) {
            htmlParts.push(`
            <span class="address-component">State: ${common.state}</span>
            `);
        }
        if (common.county != undefined) {
            htmlParts.push(`
            <span class="address-component">County: ${common.county}</span>
            `);
        }
        if (common.postcode != undefined) {
            htmlParts.push(`
            <span class="address-component">
                Postal Code: ${common.postcode}
            </span>
            `);
        }
        if (common.city != undefined) {
            htmlParts.push(`
            <span class="address-component">City: ${common.city}</span>
            `);
        }
        if (common.road != undefined) {
            htmlParts.push(`
            <span class="address-component">Road: ${common.road}</span>
            `);
        }

        /**
         * Convert uncommon components to HTML if there aren't enough common
         * components to display
         */
        if (common.length < minimumCommonComponents) {
            for(const component in uncommon) {
                let formattedComponent = formatAddressComponent(component);
                htmlParts.push(`
                <span class="address-component">${formattedComponent}: ${uncommon[component]}</span>
                `);
            }
        }

        return htmlParts.join("");
    }

    /**
     * Display the provided addresses in the found addresses modal
     */
    function displayAddresses(addressOptions) {
        // Display each of the address options
        if (addressOptions.length > 0) {
            for(const addressOption of addressOptions) {
                const htmlElements = [];
                const radioInput = `
                <input
                    type="radio"
                    id="${addressOption.placeId}"
                    class="address-option"
                    name="address"
                    value="${addressOption.lat},${addressOption.lon}">
                `;
                htmlElements.push(radioInput);

                const customRadioInput = '<span class="custom-radio"></span>';
                htmlElements.push(customRadioInput);

                let addressAsText = convertAddressToHTML(addressOption.addressComponents);
                const labelTag = `
                <label for="${addressOption.placeId}" class="address-option-label">
                    ${addressAsText}
                </label>
                `;
                htmlElements.push(labelTag);

                // Also include a break tag
                htmlElements.push("<br>");

                const htmlContent = `
                <div class="address-option-div">
                    ${htmlElements.join("\n")}
                </div>
                `;
                $(".select-address").append(htmlContent);
            }

            // Set the address options to be required
            $(".address-option").first().attr("required", true);

            // Create the submit button
            $(".select-address").append(`
            <button type="submit" class="submit-button address-submit">
                Submit Selected Address
            </button>
            `);
        } else {
            /**
             * Either the fetch didn't return any addresses, or all of the
             * returned addresses were invalid
             */
            const message = "No addresses were found";
            console.log(message);
            $(".find-addresses-status").text(message);
        }
    }

    /**
     * Find the best address of the provided addresses
     */
    function getBestAddress(addresses) {
        // Keep only the addresses with the best match code
        /**
         * I haven't found any test data with duplicate addresses that have
         * different match codes.  Until I find any such data, there's no need
         * to compare match codes
         */

        // Keep only the addresses with the most granular match level
        /**
         * I haven't found any test data with duplicate addresses that have
         * different match levels.  Until I find any such data, there's no
         * need to compare match levels
         */

        /**
         * If there are still multiple addresses left, then they're
         * equal-enough; return the first one
         */
        return addresses[0];
    }

    /**
     * Return a new array with the following: From each set of addresses that
     * have identical common address components, remove all addresses except
     * for the best address
     */
    function removeDuplicates(allAddressData) {
        const uniqueAddressData = [];
        for(const addressData of allAddressData) {
            /**
             * Check if an equivalent address option already exists in the
             * filtered array
             */
            const existingDataIndex = uniqueAddressData.findIndex((data) => {
                return _.isEqual(data.addressComponents.common, addressData.addressComponents.common);
            });

            // Found a duplicate address
            if (existingDataIndex > -1) {
                const existingData = uniqueAddressData[existingDataIndex];
                console.log(`Address ${addressData.placeId} has an identical match: address ${existingData.placeId}`);

                // Keep the better of the two addresses
                const bestAddress = getBestAddress([addressData, existingData]);
                console.log(`----Keeping address ${bestAddress.placeId} and removing address ${existingData.placeId}`);
                uniqueAddressData[existingDataIndex] = bestAddress;
            } else {
                // Not a duplicate address
                uniqueAddressData.push(addressData);
            }
        }

        return uniqueAddressData;
    }

    /**
     * Return an object containing the uncommon address components of the
     * provided components
     */
    function getUncommonComponents(addressComponents) {
        const returningComponents = {};
        for(const component in addressComponents) {
            if (!commonAddressComponents.includes(component)) {
                returningComponents[component] = addressComponents[component];
            }
        }

        return returningComponents;
    }

    /**
     * Return an object containing the common address components of the
     * provided components
    */
    function getCommonComponents(addressComponents) {
        const returningComponents = {};
        for(const component in addressComponents) {
            if (commonAddressComponents.includes(component)) {
                returningComponents[component] = addressComponents[component];
            }
        }

        return returningComponents;
    }

    /**
     * Return true if the provided address refers to an area that is too large
     */
    function addressIsTooLarge(addressJson) {
        // island, borough, city, county, state, country, marine, postalcode
        const unacceptableMatchLevels = matchLevels.slice(-8);

        /**
         * The match level is a LocationIQ API property that represents the
         * granularity of the address
         */
        const matchLevel = addressJson.matchquality.matchlevel;
        return unacceptableMatchLevels.includes(matchLevel);
    }

    /**
     * Return true if the provided address is unlikely to match the search
     * parameters
     */
    function addressIsUnlikely(addressJson) {
        // approximate
        const unacceptableMatchCodes = matchCodes.slice(-1);

        /**
         * The match code is a LocationIQ API property that represents the
         * likelihood the returned address matches its search parameters
         */
        const matchCode = addressJson.matchquality.matchcode;
        return unacceptableMatchCodes.includes(matchCode);
    }

    /**
     * Return true if the provided address passes all the tests
     */
    function addressIsValid(addressJson) {
        // Fail the address if it's missing a country
        if (addressJson.address.country == undefined) {
            console.log(`Removing address ${addressJson.place_id}: it is missing its country`);
            return false;
        }

        /**
         * Fail the address if its probability of matching the search
         * parameters is too low
         */
        if (addressIsUnlikely(addressJson)) {
            console.log(`Removing address ${addressJson.place_id}: it is unlikely to match the user's search parameters`);
            return false;
        }

        if (addressIsTooLarge(addressJson)) {
            console.log(`Removing address ${addressJson.place_id}: it refers to an area that is too large`);
            return false;
        }

        return true;
    }

    /**
     * Return an array containing the relevant data from each of the provided
     * addresses that are valid
     */
    function getRelevantAddressData(addressesJson) {
        const relevantData = [];

        // Iterate through the returned address options
        if (fetchReturnedAddresses) {
            for(const addressJson of addressesJson) {
                if (addressIsValid(addressJson)) {
                    const addressOption = {};

                    // Make a copy of the addressJson's address object
                    const addressComponentsCopy = { ...addressJson.address };

                    // Remove extra address component fields
                    if (addressComponentsCopy.country_code != undefined) {
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

    /**
     * Fetch JSON address data from the provided LocationIQ URL, handle if no
     * addresses are returned, and handle if some other problem occurs with
     * the request
     */
    function fetchCoordinatesJson(url) {
        return fetch(url).then((response) => {
            if (response.ok) {
                fetchReturnedAddresses = true;
                return response.json();
            } else if (response.status === 404) {
                // No addresses were returned
                return response.json();
            } else {
                throw Error(response.statusText);
            }
        });
    }

    /**
     * Use the LocationIQ API to convert the provided address into latitude
     * and longitude coordinates, then fetch the wildlife data
     */
    function getLatLonCoordinates(address) {
        const baseURL = "https://us1.locationiq.com/v1/search.php";
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
        const url = baseURL + "?" + queryParams;
        console.log(`Fetching data from the LocationIQ API: ${url}`);

        return fetchCoordinatesJson(url);
    }

    /**
     * Reset all variables and DOM elements that are left over from previous
     * address searches
     */
    function resetEnvironment() {
        fetchReturnedAddresses = false;

        // Clear previous errors
        $(".find-addresses-status").text("");

        // Clear previous addresses results
        $(".select-address").empty();
    }

    /**
     * Create an event listener for when the "Find Address" button is clicked
     */
    function handleFindAddressClick() {
        $(".search-form.address").submit((event) => {
            event.preventDefault();

            console.log("Starting address search");

            $(".find-address").prop("disabled", true);

            resetEnvironment();

            // Grab user input
            const userAddress = {};
            userAddress.street = $("#search-street").val();
            userAddress.city = $("#search-city").val();
            userAddress.county = $("#search-county").val();
            userAddress.postalCode = $("#search-postal-code").val();

            userAddress.country = $("#search-country").val();
            if (userAddress.country === "United States of America") {
                userAddress.state = $("#search-state").val();
            } else {
                /**
                 * Ignore the "US State or Territory" field if the country
                 * isn't the United States of America
                 */
                userAddress.state = "";
            }

            // Tell the user the search is running
            $(".find-address").text("Searching...");

            getLatLonCoordinates(userAddress)
            .then((addressesJson) => {
                console.log("----------Addresses found----------");
                console.log(addressesJson);

                const allAddressData = getRelevantAddressData(addressesJson);
                const uniqueAddressData = removeDuplicates(allAddressData);
                return uniqueAddressData;
            })
            .then(displayAddresses)
            .catch(handleError)
            .finally(endSearch);
        });
    }

    /**
     * Enable the user to fill out the wildlife search form
     */
    function enableWildlifeSearch() {
        /**
         * Enable all form elements in the wildlife search except for the
         * "Found Address" field
         */
        $(".wildlife-form *:disabled").not("#found-address")
            .removeAttr("disabled");

        /**
         * Add the "checked" class to all custom checkboxes that are
         * overlaying checked checkboxes
         */
        const customCheckboxes = $(".custom-checkbox");
        for(const customCheckbox of customCheckboxes) {
            const checkedRealCheckbox = $(customCheckbox)
                .siblings('input[type="checkbox"]:checked');
            if (checkedRealCheckbox.length > 0) {
                $(customCheckbox).addClass("checked");
            }
        }

        /**
         * Remove the "disabled" class from the custom checkboxes for the
         * wildlife types
         */
        $(".custom-checkbox").removeClass("disabled");
        
        console.log("Wildlife search enabled");
    }

    /**
     * Create an event listener for when the address is submitted from the
     * modal
     */
    function handleSubmitAddress() {
        $(".select-address").submit((event) => {
            event.preventDefault();

            // Get the selected coordinates
            const coordinates = $('.select-address input[name="address"]:checked')
                .val();
            console.log(`Selected address coordinates: ${coordinates}`);

            // Store the selected coordinates in the "Found Address" field
            $("#found-address").val(coordinates);

            // Close the modal
            MicroModal.close("addresses-modal");

            // Enable the wildlife search form, if it's disabled
            if ($(".wildlife-submit:disabled").length > 0) {
                enableWildlifeSearch();
            }
        });
    }

    handleFindAddressClick();
    handleSubmitAddress();
}

/**
 * "Check" the custom radio button for an address option when the user clicks
 * it
 */
function selectAddressOption() {
    $(".select-address").on("click", ".address-option", (event) => {
        // "Uncheck" all custom radio buttons
        $(".custom-radio").removeClass("checked");

        const selectedCustomRadio = $(event.currentTarget)
            .siblings(".custom-radio");
        selectedCustomRadio.addClass("checked");
    });
}

/**
 * "Check/Uncheck" the custom checkbox for the wildlife type when the user
 * clicks it
 */
function checkWildlifeType() {
    $('.wildlife-type input[type="checkbox"]').click((event) => {
        const customCheckbox = $(event.currentTarget)
            .siblings(".custom-checkbox");

        customCheckbox.toggleClass("checked");
    });
}

/**
 * Search for wildlife
 */
function wildlifeSearch() {
    /**
     * The number of observations returned by the iNaturalist API per page of
     * observations
     */
    const wildlifePerPage = 200;

    // The statuses and errors that occur during the wildlife search
    const searchProblems = [];

    const newWindowIconGreen = `
    <img class="new-window-icon-green" src="Images/new-window-icon-green.png" alt="new window">
    `;

    /**
     * Handle the provided error
     */
    function handleError(error) {
        const errorMessage = `An error occurred while searching for wildlife: ${error.message}`;
        console.log(errorMessage);
        searchProblems.push(errorMessage);
    }

    /**
     * Return a new array holding the provided sightings converted into img
     * elemnts and captions for those images
     */
    function createPhotosAndCaptions(sightings, organismName) {
        const photosAndCaptions = [];

        for(const sighting of sightings) {
            for(const photoURL of sighting.photoURLs) {
                const photoAndCaption = {};
                photoAndCaption.photo = `
                <img
                    class="organism-photo"
                    src="${photoURL}"
                    alt="${organismName}">
                `;
                photoAndCaption.caption = `
                <p class="caption">Observed by iNaturalist user ${sighting.observer} on ${sighting.date}</p>
                `;
                photosAndCaptions.push(photoAndCaption);
            }
        }

        return photosAndCaptions;
    }

    /**
     * Convert the wildlife sightings of the provided organism to an HTML
     * string to be displayed to the DOM
     */
    function convertSightingsToHTML(sightings, name) {
        const photosAndCaptions = createPhotosAndCaptions(sightings, name);

        let onFirstPhoto = true;
        const sightingsAsHTML = photosAndCaptions.map((photoAndCaption) => {
            const sightingId = cuid();

            // Add extra CSS classes for the first photo
            const sightingClasses = ["sighting"];
            if (onFirstPhoto) {
                sightingClasses.push("default-sighting");
                sightingClasses.push("js-current-sighting");
            }
            const classesString = sightingClasses.join(" ");

            // Add arrow buttons if there are multiple photos
            const photoElements = [photoAndCaption.photo];
            if (photosAndCaptions.length > 1) {
                /**
                 * Add the hidden class for the left arrow button of the first
                 * photo
                 */
                const leftButtonClasses = ["slideshow-button", "left-arrow-button"];
                if (onFirstPhoto) {
                    leftButtonClasses.push("hidden");
                }

                // Add the left arrow button
                photoElements.push(`
                <button type="button"
                class="${leftButtonClasses.join(" ")}">
                    <img
                    src="Images/left-arrow.png"
                    alt="previous image"
                    class="arrow-img">
                </button>
                `);

                // Add the right arrow button
                photoElements.push(`
                <button type="button"
                class="slideshow-button right-arrow-button">
                    <img src="Images/right-arrow.png" alt="next image"
                    class="arrow-img">
                </button>
                `);
            }
            const photoElementsString = photoElements.join(" ");

            // Done working with the first photo
            if (onFirstPhoto) {
                onFirstPhoto = false;
            }

            return `
            <div class="${classesString}" data-sighting-id="${sightingId}">
                <div class="organism-photo-div">
                    ${photoElementsString}
                </div>
                ${photoAndCaption.caption}
            </div>
            `;
        }).join("\n");

        return sightingsAsHTML;
    }

    /**
     * Display the wildlife data to the DOM
     */
    function displayData(data) {
        for(const organism of data) {
            const sightingsAsHTML = convertSightingsToHTML(organism.sightings, organism.name);

            const organismId = cuid();

            $(".wildlife-results .results-list").append(`
            <li class="wildlife-result" data-organism-id="${organismId}">
                <section class="sightings">
                    ${sightingsAsHTML}
                </section>

                <h3 class="organism-name">${organism.name}</h3>
                <a href="${organism.wikiURL}" target="_blank">
                    ${organism.wikiURL}${newWindowIconGreen}
                </a>
            </li>
            `);

            /**
             * Some organisms may not have their wikipedia intros if the
             * Wikipedia fetch couldn't find anything, or if some other error
             * occurred with the fetch
             */
            if (organism.wikiIntro != undefined) {
                $(`.wildlife-result[data-organism-id="${organismId}"]`)
                    .find(".organism-name")
                    .after(`<p>${organism.wikiIntro}</p>`);
            }
        }

        /**
         * Set the width of each sighting (photo and caption) in each
         * organism's slideshow to the with of the photo
         */
        $('.organism-photo').each((i, elem) => {
            $(elem).on('load', (event) => {
                const img = event.currentTarget;
                const width = $(img).actual("width");
                $(img).closest(".sighting").css('width', `${width}px`);
            });
        });
    }

    /**
     * Convert the provided photo URL into a URL that points to a larger photo
     */
    function createNewPhotoURL(originalURL) {
        return originalURL.replace("/square.jp", "/small.jp");
    }

    /**
     * Find and return photo URLs from the provided JSON
     */
    function getPhotoURLs(photosJson) {
        const photoURLs = [];
        photosJson.forEach((photoJson) => {
            const originalURL = photoJson.url;

            /**
             * The photo in the response data is way too small. This method
             * constructs a URL pointing to a larger photo
             */
            const desiredURL = createNewPhotoURL(originalURL);
            photoURLs.push(desiredURL);
        });

        return photoURLs;
    }

    /**
     * Handle any errors or warnings in the Wikipedia response
     */
    function handleWikiResponseProblems({errors, warnings}) {
        if (errors != undefined) {
            for(const errorJson of errors) {
                console.log(`An error was found in the Wikipedia response: ${errorJson.html}`);
                searchProblems.push(`Some wildlife may be missing their description text because there was an error with Wikipedia: '${errorJson.html}'`);
            }
        }

        if (warnings != undefined) {
            for(const warningJson of warnings) {
                console.log(`A warning was found in the Wikipedia response: ${warningJson.html}`);
            }
        }
    }

    /**
     * Search through the Wikipedia responses and store any Wikipedia intros
     * that were returned
     *
     * - Handle any errors and warnings found
     * - Handle any Wikipedia pages that Wikipedia couldn't find intros for
     */
    function processWikiIntros(promiseResults, allDisplayData) {
        let introsWereMissing = false;

        console.log("----------Wikipedia Intros Found----------");

        // Loop through each MediaWiki Response
        for(let resultCount = 0; resultCount < promiseResults.length; resultCount++) {
            const wikipediaJson = promiseResults[resultCount];
            console.log(wikipediaJson);

            handleWikiResponseProblems(wikipediaJson);

            // Log if Wikipedia couldn't access any of the organisms' pages
            if (
                wikipediaJson.batchcomplete != undefined
                && wikipediaJson.batchcomplete === false
            ) {
                console.log("Some Wikipedia data could not be returned in the response.");
                introsWereMissing = true;
            }

            if (
                wikipediaJson.query != undefined
                && wikipediaJson.query.pages != undefined
            ){
                const wikipediaPages = wikipediaJson.query.pages;

                /**
                 * Each successful MediaWiki Response has 20 Wikipedia pages
                 * in it (except the last one, which may have fewer)
                 */
                const pageBracket = resultCount * 20;

                /**
                 * Store the page intro that corresponds to each organism in
                 * the page bracket
                 */
                for(let i = 0; i < wikipediaPages.length; i++) {
                    // Grab the ith organism of the current page bracket
                    const organismData = allDisplayData[pageBracket + i];

                    /**
                     * Grab the organism's page title and add spaces back into
                     * it, so it matches the format of the JSON page titles
                     */
                    const wikiURL = organismData.wikiURL;
                    const organismPageTitle = getPageTitle(wikiURL)
                        .replace(/_/g, " ");

                    /**
                     * Store the Wikipedia intro for the organism, if it was
                     * found by the Wikipedia fetch.  The Wikipedia intro has
                     * to be searched for because MediaWiki returns the
                     * results of the multi-page request in a random order.
                     */
                    const wikiIntroJson = wikipediaPages
                        .find((element) => element.title === organismPageTitle);
                    if (
                        wikiIntroJson != undefined
                        && wikiIntroJson.extract != undefined
                    ) {
                        organismData.wikiIntro = wikiIntroJson.extract;
                    } else {
                        console.log(`No Wikipedia intro was found for organism: ${organismData.name}`);
                        introsWereMissing = true;
                    }
                }
            }
        }

        /**
         * Tell the user if any Wikipedia intros couldn't be found or
         * retrieved for any reason
         */
        if (introsWereMissing) {
            searchProblems.push("Some organisms' Wikipedia excerpts could not be retrieved or found.");
        }

        return allDisplayData;
    }

    /**
     * Return the page title of the provided Wikipedia URL
     */
    function getPageTitle(wikiURL) {
        return wikiURL.split("/").pop();
    }

    /**
     * Fetch the intro sections from each of the provided Wikipedia URLs
     */
    function getWikipediaData(wikiURLs) {
        const baseURL = "https://en.wikipedia.org/w/api.php";
        const params = {
            action: "query",
            prop: "extracts",
            exintro: "true",
            titles: "",
            explaintext: "1",
            formatversion: "2",
            format: "json",
            origin: "*",
            errorformat: "html"
        }

        const promises = [];

        /**
         * Break up the URLs into groups of 20, to make fewer calls to the
         * MediaWiki API
         */
        const wikiURLGroups = _.chunk(wikiURLs, 20);

        for(const wikiURLGroup of wikiURLGroups) {
            /**
             * Combine all the URLs in this group into page titles separated
             * by "|"
             */
            const pageTitles = [];
            for(const wikiURL of wikiURLGroup) {
                const pageTitle = getPageTitle(wikiURL);
                pageTitles.push(pageTitle);
            }
            params.titles = pageTitles.join("|");

            const queryParams = formatQueryParams(params);
            const url = baseURL + "?" + queryParams;

            console.log(`Fetching data from Wikipedia: ${url}`);
            promises.push(fetchJson(url));
        }

        return Promise.all(promises);
    }

    /**
     * Return a new array that merges all the duplicate organisms from the
     * provided display data
     */
    function mergeDuplicateOrganismData(allDisplayData) {
        const mergedDuplicates = [];
        for(const organismData of allDisplayData) {
            const existingData = mergedDuplicates
                .find((element) => element.name === organismData.name);

            /**
             * Add organismData's sightings to the existing sightings of that
             * organism in mergedDuplicates
             */
            if (existingData != undefined) {
                existingData.sightings.push(...organismData.sightings);
            } else {
                /**
                 * Not a duplicate organism; add all of its data to the
                 * mergedDuplicates array
                 */
                mergedDuplicates.push(organismData);
            }
        }

        return mergedDuplicates;
    }

    /**
     * Return the sighting data of the provided iNaturalist API observation
     */
    function getSightingData({photos, observed_on, user}) {
        const sighting = {};
        sighting.photoURLs = getPhotoURLs(photos);
        sighting.date = observed_on;
        sighting.observer = user.login;
        return sighting;
    }

    /**
     * Return the useful data from the HTTP Response
     */
    function getRelevantData({results}) {
        const relevantData = [];

        for(const iNatObservation of results) {
            const organism = iNatObservation.taxon;

            /**
             * Use the organism's scientific name if it doesn't have a
             * preferred common name
             */
            let name = organism.preferred_common_name;
            if (organism.preferred_common_name == undefined) {
                name = organism.name;
            }

            // Ignore wildlife data that doesn't have a wikipedia URL
            if (organism.wikipedia_url != null) {
                const organismData = {};
                organismData.name = name;
                organismData.sightings = [];
                const sighting = getSightingData(iNatObservation);
                organismData.sightings.push(sighting);

                organismData.wikiURL = organism.wikipedia_url;

                relevantData.push(organismData);
            } else {
                console.log(`Removing observation for ${name}: no wikipedia link was found.`);
            }
        }

        return relevantData;
    }

    /**
     * Fetch a page of wildlife data from the iNaturalist API
     */
    function getPageOfWildlifeData(
        latitude,
        longitude,
        radius,
        iconicTaxa,
        name,
        startDate,
        endDate,
        page=1
    ) {
        const baseURL = "https://api.inaturalist.org/v1/observations";

        const params = {
            radius,
            lat: latitude,
            lng: longitude,
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

        const url = baseURL + "?" + queryParams;
        console.log(`Fetching data from the iNaturalist API: ${url}`);
        return fetchJson(url);
    }

    /**
     * Fetch pages of wildlife data, filtering out results from each set,
     * until all results are collected
     */
    async function getAllWildlifeData(
        latitude,
        longitude,
        radius,
        iconicTaxa,
        name,
        startDate,
        endDate
    ) {
        let page = 1;
        let numOrganismsThisPage = 0;
        const allDisplayData = [];
        let totalResults;
        let totalPages;

        // Loop through all pages of wildlife data
        while (true) {
            await getPageOfWildlifeData(
                latitude,
                longitude,
                radius,
                iconicTaxa,
                name,
                startDate,
                endDate,
                page
            )
            .then((wildlifeJson) => {
                console.log(`----------Wildlife Page ${page} Data----------`);
                console.log(wildlifeJson);

                // Calculate the total number of pages to process
                if (page === 1) {
                    totalResults = wildlifeJson.total_results;
                    totalPages = Math.ceil(totalResults/wildlifePerPage);
                }

                numOrganismsThisPage = wildlifeJson.results.length;

                // Avoid telling the user the app is processing page x of 0
                if (totalPages > 0) {
                    $(".search-status")
                        .text(`Processing page ${page} of ${totalPages} of wildlife observations.`);
                }
                const newDisplayData = getRelevantData(wildlifeJson);
                allDisplayData.push(...newDisplayData);
            })
            .catch(handleError);

            /**
             * If the HTTP Response doesn't have enough observations to meet
             * its page limit, then all following pages of observations will
             * be empty.
             */
            if (numOrganismsThisPage < wildlifePerPage) {
                break;
            }

            page++;
        }

        if (allDisplayData.length > 0) {
            console.log("Merging duplicate species");
            $(".search-status").text("Merging duplicate species.");
            const mergedDuplicates = mergeDuplicateOrganismData(allDisplayData);
            return mergedDuplicates;
        }

        // No results were found
        return allDisplayData;
    }

    /**
     * Update DOM to reflect the search results
     */
    function endSearch() {
        // Load the status messages to the DOM
        for(const searchProblem of searchProblems) {
            $(".search-problems").append(`
            <p class="wildlife-status">${searchProblem}</p>
            `);
        }

        // Remove searching message from page
        console.log("Search complete");
        $(".search-status").text("Search complete");
        $(".search-status").addClass("hidden")

        $(".wildlife-results").removeClass("hidden");

        $(".wildlife-submit").prop("disabled", false);
    }

    /**
     * Convert the HTML date string into a Date object
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

    /**
     * Return true if the provided dates pass all tests
     */
    function testDates(startString, endString) {
        // Convert the strings into Date objects
        const startDate = parseDate(startString);
        const endDate = parseDate(endString);
        const currentDate = new Date();

        // Fail if either date is in the future
        if (startDate > currentDate || endDate > currentDate) {
            console.log("Error: The user entered a future date.");
            searchProblems.push("Unable to search: You cannot use future dates for your search.");

            return false;
        } else if (startDate > endDate) {
            // Fail if the start date is after the end date
            console.log("Error: The user entered a start date that was after the end date.");
            searchProblems.push("Unable to search: Your start date cannot be after your end date.");

            return false;
        }

        return true;
    }

    /**
     * Convert the wildlife types to the parameters expected by the
     * iNaturalist API
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

        return wildlifeTypes
            .map((wildlifeType) => wildlifeIconicTaxaConversion[wildlifeType]);
    }

    /**
     * Return an array of values containing which "Types of Wildlife"
     * checkboxes have been checked
     */
    function getWildlifeTypes() {
        const wildlifeTypes = [];
        const wildlifeCheckedBoxes = $('.wildlife-types input[name="wildlife-type"]:checked');

        wildlifeCheckedBoxes.each((index) => {
            const wildlifeCheckedBox = wildlifeCheckedBoxes[index];
            const checkboxValue = $(wildlifeCheckedBox).attr("value");
            wildlifeTypes.push(checkboxValue);
        });

        return wildlifeTypes;
    }

    /**
     * Process the user's search parameters and output the resulting wildlife
     */
    function handleSearchSubmit() {
        $(".search-form.wildlife-form").submit((event) => {
            event.preventDefault();

            $(".wildlife-submit").prop("disabled", true);

            // Hide the search results section from the page
            $(".wildlife-results").addClass("hidden");

            // Clear any previous search results
            $(".wildlife-result").remove();
            $(".no-results").remove();

            // Clear any previous statuses
            $(".search-problems").empty();
            _.remove(searchProblems, (elem) => true);

            // Tell the user the search is running
            console.log("Starting wildlife search");
            $(".search-status").text("Searching...");
            $(".search-status").removeClass("hidden");

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
            if (datesAreValid) {
                let allDisplayData = [];

                getAllWildlifeData(
                    latitude,
                    longitude,
                    radius,
                    iconicTaxa,
                    name,
                    startDate,
                    endDate
                )
                .then((filteredData) => {
                    if (filteredData.length > 0) {
                        allDisplayData = filteredData;

                        // Create an array of just the Wikipedia URLs
                        return allDisplayData.map((data) => data.wikiURL);
                    }

                    // No valid wildlife data was found
                    return [];
                })
                .then((wikiURLs) => {
                    if (wikiURLs.length > 0) {
                        console.log("Fetching the Wikipedia intros");
                        $(".search-status")
                            .text("Fetching the Wikipedia intros");

                        return getWikipediaData(wikiURLs);
                    }

                    /**
                     *  No promises are started because there are no wikiURLs
                     * to fetch from
                     */
                    return [];
                })
                .then((promiseResults) => {
                    if (promiseResults.length > 0) {
                        console.log("Processing the Wikipedia intros");
                        $(".search-status")
                            .text("Processing the Wikipedia intros");

                        return processWikiIntros(promiseResults, allDisplayData);
                    }

                    /**
                     * No display data is returned because there is no
                     * wildlife data
                     */
                    return [];
                })
                .then((data) => {
                    if (data.length > 0) {
                        console.log("Converting the wildlife data to a displayable format");
                        $(".search-status")
                            .text("Converting the wildlife data to a displayable format");

                        displayData(data);
                    } else {
                        $(".wildlife-results").append(`
                        <p class="no-results">No wildlife observations found.</p>
                        `);
                    }
                })
                .catch(handleError)
                .finally(endSearch);
            } else {
                // Dates are invalid
                endSearch();
            }
        });
    }

    handleSearchSubmit();
}

/**
 * Handle switching between sightings in the sighting slideshows for wildlife
 * search results
 */
function handleSightingTransitions() {
    /**
     * Return true if the currently-displayed sighting is the last in its
     * slideshow
     */
    function onLastSighting(organismId) {
        const currentOrganism = $(`.wildlife-result[data-organism-id="${organismId}"]`);
        const currentSighting = currentOrganism.find(".sighting.js-current-sighting");

        const nextSighting = currentSighting.next(".sighting");
        return nextSighting.length === 0;
    }

    /**
     * Return true if the currently-displayed sighting is the first in its
     * slideshow
     */
    function onFirstSighting(organismId) {
        const currentOrganism = $(`.wildlife-result[data-organism-id="${organismId}"]`);
        const currentSighting = currentOrganism
            .find(".sighting.js-current-sighting");

        const prevSighting = currentSighting.prev(".sighting");
        return prevSighting.length === 0;
    }

    /**
     * Hide from the page the currently displayed sighting, for the provided
     * organism
     */
    function hideCurrentSighting(organismID) {
        const currentOrganism = $(`.wildlife-result[data-organism-id="${organismID}"]`);
        const currentSighting = currentOrganism
            .find(".sighting.js-current-sighting");

        currentSighting.removeClass("js-current-sighting");
        currentSighting.hide();
    }

    /**
     * Show on the page the sighting with the provided sighting ID, for the
     * organism with the provided organism ID
     */
    function showSighting(organismId, sightingId) {
        const organism = $(`.wildlife-result[data-organism-id="${organismId}"]`);
        const sightingToShow = organism
            .find(`.sighting[data-sighting-id="${sightingId}"]`);

        // Check if there are sightings with that ID to show
        if (sightingToShow.length > 0) {
            sightingToShow.addClass("js-current-sighting");

            const slideshowButtons = organism.find(".slideshow-button");

            // Disable the buttons until after the animation finishes
            slideshowButtons.prop("disabled", true);
            sightingToShow.show("fade", "linear", 600, () => {
                slideshowButtons.prop("disabled", false);
            });
        }
    }

    /**
     * Show/Hide the arrow buttons for the current sighting of the provided
     * organism
     */
    function updateButtonsDisplayed(organismId) {
        const currentOrganism = $(`.wildlife-result[data-organism-id="${organismId}"]`);
        const currentSighting = currentOrganism
            .find("div.js-current-sighting");
        const leftArrow = currentSighting.find(".left-arrow-button");
        const rightArrow = currentSighting.find(".right-arrow-button");

        if (onLastSighting(organismId)) {
            leftArrow.show();
            rightArrow.hide();
        } else if (onFirstSighting(organismId)) {
            leftArrow.hide();
            rightArrow.show();
        } else {
            //On some sighting in the middle
            leftArrow.show();
            rightArrow.show();
        }
    }

    /**
     * Handle switching to the next sighting when the right arrow button is
     * clicked
     */
    function handleNextSighting() {
        $(".wildlife-results").on("click", ".right-arrow-button", (event) => {
            const organismId = $(event.currentTarget)
                .parents(".wildlife-result")
                .data("organism-id");
            const currentSighting = $(event.currentTarget)
                .parents(".wildlife-result")
                .find(".sighting.js-current-sighting");

            hideCurrentSighting(organismId);

            const nextSightingId = currentSighting.next(".sighting")
                .data("sighting-id");
            showSighting(organismId, nextSightingId);

            updateButtonsDisplayed(organismId);
        });
    }

    /**
     * Handle switching to the previous sighting when the left arrow button is
     * clicked
     */
    function handlePrevSighting() {
        $(".wildlife-results").on("click", ".left-arrow-button", (event) => {
            const organismId = $(event.currentTarget)
                .parents(".wildlife-result")
                .data("organism-id");
            const currentSighting = $(event.currentTarget)
                .parents(".wildlife-result")
                .find(".sighting.js-current-sighting");

            hideCurrentSighting(organismId);

            const prevSightingId = currentSighting.prev(".sighting")
                .data("sighting-id");
            showSighting(organismId, prevSightingId);

            updateButtonsDisplayed(organismId);
        });
    }

    handleNextSighting();
    handlePrevSighting();
}

$(function() {
    MicroModal.init();
    MicroModal.show('about-modal', {
        disableFocus: true
    });

    setDefaultDates();
    addressSearch();
    selectAddressOption();
    checkWildlifeType();
    wildlifeSearch();
    handleSightingTransitions();
});