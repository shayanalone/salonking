
const BASE_URL = 'https://salonking-backend.vercel.app'; // Replace with your actual Vercel URL

const images = [
    'https://images.unsplash.com/photo-1662125502527-bb106378d560?w=1000',
    'https://images.unsplash.com/photo-1603291783835-12c1ebe6c701?w=1000',
    'https://images.unsplash.com/photo-1629641320554-c8e8cfed610f?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzJ8fHNhbG9uJTIwaW50ZXJpb3J8ZW58MHwxfDB8fHwy'
];

let index = 0;
const bg1 = document.getElementById('bg1');
const bg2 = document.getElementById('bg2');
let isBg1Active = true;

// Set first background instantly
bg1.style.backgroundImage = `url('${images[0]}')`;

// After a short delay, enable transitions
setTimeout(() => {
    bg1.classList.add('transition-enabled');
    bg2.classList.add('transition-enabled');
}, 100); // 100ms delay is enough

function changeBackground() {
    const nextImage = images[(index + 1) % images.length];

    if (isBg1Active) {
    bg2.style.backgroundImage = `url('${nextImage}')`;
    bg2.classList.add('active');
    bg1.classList.remove('active');
    } else {
    bg1.style.backgroundImage = `url('${nextImage}')`;
    bg1.classList.add('active');
    bg2.classList.remove('active');
    }

    isBg1Active = !isBg1Active;
    index = (index + 1) % images.length;
}

setInterval(changeBackground, 5000); // every 5 seconds

// Slider Management
const sliders = {};

function initSlider(sliderId) {
    const slider = document.querySelector(`[data-slider-id="${sliderId}"]`);
    if (!slider) return;
    sliders[sliderId] = { currentSlide: 0 };
    sliders[sliderId].slideCount = slider.querySelectorAll('.slide').length;
}

function moveSlide(sliderId, direction) {
    const slider = sliders[sliderId];
    if (slider) {
        slider.currentSlide = (slider.currentSlide + direction + slider.slideCount) % slider.slideCount;
        const slides = document.querySelector(`[data-slider-id="${sliderId}"] .slides`);
        if (slides) {
            slides.style.transform = `translateX(-${slider.currentSlide * 100}%)`;
        }
    }
}

// Initialize static sliders
['dash-salon', 'booking-salon'].forEach(initSlider);

const placeholderImage = 'https://images.unsplash.com/photo-1749460264120-2219bc64be40?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D';

// Helper to Format Time for Next Available Slot
function getNextAvailableTime(openTime, breaks = []) {
    let time = new Date(`2000-01-01T${openTime}`);
    time.setMinutes(time.getMinutes() + 30);
    const isBreak = breaks.some(b => {
        const breakStart = new Date(`2000-01-01T${b.from}`);
        const breakEnd = new Date(`2000-01-01T${b.to}`);
        return time >= breakStart && time < breakEnd;
    });
    if (isBreak) {
        time.setMinutes(time.getMinutes() + 30);
    }
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Loading Animation
function showLoadingAnimation(grid) {
    if (!grid) return () => {};
    grid.innerHTML = '<p id="loading-text" style="text-align: center; font-weight: bold; font-size: 1em;">loading.</p> <div style="height: 200px;"></div>';
    const states = ["loading.", "loading..", "loading...", "loading..", "loading.", "loading"];
    let index = 0;
    const interval = setInterval(() => {
        const loadingText = grid.querySelector('#loading-text');
        if (loadingText) {
            loadingText.textContent = states[index];
            index = (index + 1) % states.length;
        }
    }, 300);
    return () => {
        clearInterval(interval);
        grid.innerHTML = '';
    };
}

// Lazy-Load Images
function loadImagesForCard(card, images) {
    const slides = card.querySelectorAll('.slide');
    images.forEach((img, index) => {
        if (slides[index]) {
            const image = new Image();
            image.src = img;
            image.onload = () => {
                slides[index].style.backgroundImage = `url('${img}')`;
            };
            image.onerror = () => {
                slides[index].style.backgroundImage = `url('${defaultSalonImages[index % defaultSalonImages.length]}')`;
            };
        }
    });
}

// Debounce utility to prevent rapid showSection calls
let lastSectionChange = 0;
let sectionTimeout = null; // Track ongoing timeout

function debounceShowSection(sectionId, ...args) {
    const now = Date.now();
    if (now - lastSectionChange < 350) return; // 350ms to match transition
    lastSectionChange = now;
    showSection(sectionId, ...args);
}

// Section Toggling
async function showSection(sectionId, salonName, ownerName, location) {
    // Clear all error messages
    ['login-error', 'register-error', 'settings-error', 'booking-error', 'your_booking-error', 'dashboard-error', 'manual-dashboard-error'].forEach(clearError);

    // Abort any ongoing async operations
    if (currentAbortController) {
        currentAbortController.abort();
        console.log('Aborted previous async operations');
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // Clear dashboard reload interval when leaving your-salon
    if (dashboardReloadInterval && sectionId !== 'your-salon') {
        clearInterval(dashboardReloadInterval);
        dashboardReloadInterval = null;
    }

    // Get the target section
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
        console.warn(`Section with ID "${sectionId}" not found`);
        return;
    }

    // Clear any existing timeout
    if (sectionTimeout) {
        clearTimeout(sectionTimeout);
        sectionTimeout = null;
    }

    // Immediately hide all sections to prevent overlap
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.opacity = '0';
        section.style.display = 'none'; // Ensure sections are hidden
    });

    // Show the target section
    targetSection.style.display = 'block'; // Make visible immediately
    requestAnimationFrame(() => {
        sectionTimeout = setTimeout(() => {
            targetSection.classList.add('active');
            targetSection.style.opacity = '1';
            // Scroll to top after transition
            requestAnimationFrame(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' , inline: 'center'});
            });
        }, 10); // Small delay to ensure display change takes effect
    });

    // Handle back button visibility
    const backBtn = document.getElementById('back-btn');
    if (sectionId === 'home') {
        backBtn.classList.remove('visible');
        await renderSalons(signal);
    } else {
        backBtn.classList.add('visible');
    }

    // Handle specific section logic
    if (sectionId === 'your-salon') {
        showForm('salon-loading');
        shouldScrollOnDashboard = true;
        await showDashboard();
    } else if (sectionId === 'your-booked-salon') {
        
        const booking_grid = document.getElementById('bookings-grid');
        booking_grid.innerHTML = '';

        const userBookings = await GetUserBooking(deviceId , signal);

        if (userBookings.length === 0) {
            const noBookingSection = document.getElementById('no-booking');
            if (noBookingSection) {
                noBookingSection.style.display = 'block';
                requestAnimationFrame(() => {
                    noBookingSection.classList.add('active');
                    noBookingSection.style.opacity = '1';
                    // Scroll to top after transition
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                });
                targetSection.style.display = 'none';
                targetSection.classList.remove('active');
            }
        } else {
            await renderUserBookings(userBookings);
        }
    } else if (sectionId === 'user-booking' && salonName) {
        const salon = salons.find(s => s.salonName === salonName);
        document.getElementById('customer-name').value = "";
        document.getElementById('booking-salon-name').textContent = salonName;
        document.getElementById('booking-owner-name').innerHTML = `<strong>Owner:</strong> ${ownerName}`;
        document.getElementById('booking-location').innerHTML = `<strong style="font-size: 100%; line-height: 17px;">Location:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" target="_blank" style="font-size: 100%;  color: rgb(0, 157, 255);">${location}</a>`;
        document.getElementById('booking-salon-discounts').textContent = salon.WholeServiceDiscounting > 0 ? `Discount ${salon.WholeServiceDiscounting} pkr saab services mai` : "";
        document.getElementById('booking-owner-number').innerHTML = `<strong>Owner Number:</strong> ${salon.ownerNumber}`;
        const serviceSelect = document.getElementById('booking-service');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select Service</option>';
            if (salon && salon.services) {
                salon.services.forEach(service => {
                    const option = document.createElement('option');
                    const discountedPrice = service.discounted_price || 0;
                    const wholeDiscount = salon.WholeServiceDiscounting || 0;
                    let finalPrice = service.price;
                    let displayText = `${service.name} | Price ${service.price} | ${service.time} min`;
                    if (discountedPrice > 0 || wholeDiscount > 0) {
                        if (discountedPrice > 0) {
                            finalPrice = Math.min(finalPrice, discountedPrice);
                        }
                        if (wholeDiscount > 0) {
                            finalPrice -= wholeDiscount;
                        }
                        finalPrice = Math.max(0, Math.min(service.price, finalPrice));
                        if (finalPrice < service.price) {
                            const discountPercentage = Math.round(((service.price - finalPrice) / service.price) * 100);
                            displayText = `${service.name} | Price ${finalPrice} | ${discountPercentage}% off | ${service.time} min`;
                        }
                    }
                    option.value = service.name + 'p' + finalPrice;
                    option.textContent = displayText;
                    serviceSelect.appendChild(option);
                });
            }
        }
        document.getElementById('booking-salon-openedTime').innerHTML = `<strong>Opened:</strong> ${convertTo12HourFormat(salon.openTime) || 'N/A'} - ${convertTo12HourFormat(salon.closeTime) || 'N/A'}`;
        Init_UserBooking_Times();

        const imageslider = document.getElementById('user-booking-images-slider');
        const placeholderImage = 'https://images.unsplash.com/photo-1749460264120-2219bc64be40?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D';
        const images = salon.salonImages || [];
        imageslider.innerHTML = images.map(imageUrl => 
            `<div class="slide" style="background-image: url('${imageUrl || placeholderImage}')"></div>`
        ).join('');
        initSlider('booking-salon');
    }
}
// 

// Function to validate Pakistani phone number
function isValidPakistaniPhoneNumber(phone) {
    // Remove any whitespace or dashes
    phone = phone.replace(/\s|-/g, '').trim();
    
    // Regex for Pakistani phone numbers: 0[3]xxxxxxxxx or +92[3]xxxxxxxxx
    const pakPhoneRegex = /^(0|\+92)[3][0-9]{9}$/;
    
    // Additional check for valid mobile codes (optional)
    const validMobileCodes = [
        '300', '301', '302', '303', '304', '305', '306', '307', '308', '309',
        '310', '311', '312', '313', '314', '315', '316', '317', '318', '319',
        '320', '321', '322', '323', '324', '325', '326', '327', '328', '329',
        '330', '331', '332', '333', '334', '335', '336', '337', '338', '339',
        '340', '341', '342', '343', '344', '345', '346', '347', '348', '349',
        '360', '361', '362', '363', '364', '365', '366', '367', '368', '369'
    ];
    
    // Check if the number matches the regex
    if (!pakPhoneRegex.test(phone)) {
        return false;
    }
    
    // Extract the mobile code (first 3 digits after 0 or +92)
    const mobileCode = phone.startsWith('+92') ? phone.slice(3, 6) : phone.slice(1, 4);
    
    // Verify mobile code is valid
    return validMobileCodes.includes(mobileCode);
}
// Default Images and Placeholder
let defaultSalonImages = [
    'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1720358787956-85c0bd0a8dbb?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D',
    'https://plus.unsplash.com/premium_photo-1664048713258-a1844e3d337f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D'
];
// Track ongoing async operations
let currentAbortController = null;

// Track dashboard auto-reload
let dashboardReloadInterval = null;
let shouldScrollOnDashboard = true;

// Render Salons (Optimized)
async function renderSalons(signal) {
    const grid = document.getElementById('salon-grid');
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        // Ensure salons is an array, fall back to empty array if null/undefined
        if(salons == null || salons.length == 0){
            salons = await RunSpecialPaths("getAllSalon", { signal }) || [];
        }
        clearLoading();
        grid.innerHTML = '';
        if (salons.length === 0) {
            grid.innerHTML = '<p style="text-align: center;">No salons available. Register a salon to get started!</p>';
            return;
        }

        // Render cards with placeholders
        salons.forEach((salon, index) => {
            const sliderId = `salon-${index}`;
            const images = salon.salonImages?.length > 0 ? salon.salonImages : defaultSalonImages;
            // const nextAvailable = getNextAvailableTime(salon.openTime, salon.breaks);
            // ${salon.WholeServiceDiscounting > 0 ? `<h3 style="padding-left: 5px; background-color:rgb(255, 255, 255); border-radius: 4px; font-size: 105%; margin-top: 0px;color:rgb(255, 101, 101);">Discount: ${salon.WholeServiceDiscounting} PKR wo bhi </h3>` : ""}
            // ${salon.WholeServiceDiscounting > 0 ? `<h3 style="padding-left: 5px; background-color:rgb(255, 255, 255); border-radius: 4px; font-size: 90%; margin-top: 0px;color:rgb(255, 69, 69); margin-top: -10px;">saab services mai</h3>` : ""}
            const card = document.createElement('div');
            card.className = 'salon-card';
            card.innerHTML = `
            ${salon.WholeServiceDiscounting > 0 ? `<h3 style="height: 28px; text-align: center; padding-top: 3px; background-color:rgb(255, 255, 255); border-radius: 4px; font-size: 95%; color:rgb(255, 69, 69);">Discount ${salon.WholeServiceDiscounting} pkr saab services mai</h3>` : ""}
                <div class="slider" data-slider-id="${sliderId}">
                    <div class="slides" id="${sliderId}">
                        ${images.map(() => `<div class="slide" style="background-image: url('${placeholderImage}')"></div>`).join('')}
                    </div>
                    <button class="slider-btn prev" onclick="moveSlide('${sliderId}', -1)">❮</button>
                    <button class="slider-btn next" onclick="moveSlide('${sliderId}', 1)">❯</button>
                </div>
                <div class="details">
                    <div style="height: 10px;"></div>
                    <h3 style="font-size: 100%;  margin-top: 10px;">${salon.salonName}</h3>
                    <div style="height: 3px;"></div>
                    <p style="font-size: 82%; margin-top: -8px;"><strong>Owner:</strong> ${salon.ownerName}</p>
                    <p style="font-size: 82%; margin-top: -10px;"><strong>Opened:</strong> ${`${convertTo12HourFormat(salon.openTime) || 'N/A'} - ${convertTo12HourFormat(salon.closeTime) || 'N/A'}`}</p>
                    <p class="location" style="margin-left: 1px; margin-bottom: -5px; margin-top: -5px; line-height: 17px;"><strong style="font-size: 90%;">Location:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.location)}" target="_blank" style="font-size: 90%;  color: rgb(0, 157, 255);">${salon.location}</a></p>
                    </div>
                    <div style="height: 8px;"> </div>
                    <button class="btn" onclick="debounceShowSection('user-booking', '${salon.salonName}', '${salon.ownerName}', '${salon.location}')">Book Now</button>
                    `;
                    
                // <p style="font-size: medium; margin-bottom: -5px; margin-top: 15px;"><strong>Next Available:</strong> ${nextAvailable}</p>
            grid.appendChild(card);
            
            const imageslider = document.getElementById(sliderId);
            imageslider.innerHTML = images.map(imageUrl => 
                `<div class="slide" style="background-image: url('${imageUrl || placeholderImage}')"></div>`
            ).join('');

            initSlider(sliderId);
        });
    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('Salon rendering aborted');
            return;
        }
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading salons. Please try again.</p>';
        console.error('Error rendering salons:', e);
    }
}
// Helper: Convert HH:MM AM/PM to minutes since midnight
function timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// Helper: Convert minutes since midnight to HH:MM AM/PM
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}
// Login
async function GetYourSalon() {

    if (salon_Index < 0) {
        your_salon = null;
        localStorage.setItem('salon_Index', salon_Index);
    }else{
        const Signal = currentAbortController.signal;
        try {
            const { signal } = Signal;
            const response = await fetch(`${BASE_URL}/get_your_salon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "salonIndex":salon_Index , "salonName": salon_name , "salonPassword": salon_password }),
                signal
            });
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            if(result.status == "success"){
                
                
                if (result.salon_index >= 0) {
                    your_salon = result.salon;
                    if(salon_Index != result.salon_index){
                        localStorage.setItem('salon_Index', salon_Index);
                    }
                } else {
                    your_salon = null;
                    if(salon_Index != result.salon_index){
                        salon_Index = -1;
                        localStorage.setItem('salon_Index', salon_Index);
                    }
                }
            }else{
                your_salon = null;
                salon_Index = -1;
                localStorage.setItem('salon_Index', salon_Index);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Fetch aborted for path:`);
                throw error;
            }
            console.error(`Error fetching data from:`, error);
            throw error;
        }   
    }
}
function GetLocalDatas(){
    deviceId = localStorage.getItem("Device_Id");
    salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    salon_name = localStorage.getItem('salon_name');
    salon_password = localStorage.getItem('salon_password');
}
// Show Dashboard
async function showDashboard() {
    // showForm('salon-loading');
    await GetYourSalon();
    
    const signal = currentAbortController?.signal;
    if (salon_Index >= 0) {

        showForm('salon-dashboard' , true);
        
        const dashSalonName = document.getElementById('dash-salon-name');
        const dashOwnerName = document.getElementById('dash-owner-name');
        const dashOwnerNumber = document.getElementById('dash-owner-number');
        const dashLocation = document.getElementById('dash-location');
        const dashOverTime = document.getElementById('dash-overTime');
        const dashHours = document.getElementById('dash-hours');
        const dashBreaks = document.getElementById('dash-breaks');
        const dashServices = document.getElementById('dash-services');
        const dashWholeDiscountingServices = document.getElementById('dash-wholeDiscounting-services');
        if (dashSalonName) dashSalonName.textContent = your_salon.salonName || 'N/A';
        if (dashOwnerName) dashOwnerName.textContent = your_salon.ownerName || 'N/A';
        if (dashOwnerNumber) dashOwnerNumber.textContent = your_salon.ownerNumber || 'N/A';
        if (dashLocation) dashLocation.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(your_salon.location)}" target="_blank">${your_salon.location || 'N/A'}</a>`;
        if (dashOverTime) dashOverTime.textContent = your_salon.isOverTime == true ? "Yes" : "No";
        if (dashHours) dashHours.textContent = `${convertTo12HourFormat(your_salon.openTime) || 'N/A'} - ${convertTo12HourFormat(your_salon.closeTime) || 'N/A'}`;
        if (dashBreaks) dashBreaks.textContent = your_salon.breaks?.length > 0 ? your_salon.breaks.map(b => `${b.from} - ${b.to}`).join(', ') : 'None';
        if (dashServices) dashServices.textContent = your_salon.services?.length > 0 ? your_salon.services.map(s => s.name).join(', ') : 'None';
        if (dashWholeDiscountingServices) dashWholeDiscountingServices.textContent = your_salon.WholeServiceDiscounting + " rupee" || 'N/A';
        
        const salonBooking = await GetSalonBooking(your_salon.salonId , your_salon.salonName , salon_password , salon_Index , signal) || [];
        
        const pending = salonBooking.filter(b => b.status === 'pending');
        const completed = salonBooking.filter(b => b.status === 'completed');
        const canceled = salonBooking.filter(b => b.status === 'user canceled' || b.status === 'dash canceled');
        const manualBookings = completed.filter(b => b.deviceId == 'manual');

        const pendingBookings = document.getElementById('pending-bookings');
        const totalBookings = document.getElementById('total-bookings');
        const CanceledBooking = document.getElementById('canceled-bookings');
        const CompletedBooking = document.getElementById('completed-bookings');
        const ByWebBooking = document.getElementById('online-bookings');
        const ManualBooking = document.getElementById('manual-bookings');

        if (pendingBookings) pendingBookings.textContent = pending.length;
        if (totalBookings) totalBookings.textContent = salonBooking.length;
        if (CanceledBooking) CanceledBooking.textContent = canceled.length;
        if (CompletedBooking) CompletedBooking.textContent = completed.length;
        if (ByWebBooking) ByWebBooking.textContent = completed.length - manualBookings.length;
        if (ManualBooking) ManualBooking.textContent = manualBookings.length;

        
        const timeTakenSelect = document.getElementById('manualBooking-timeTake');
        timeTakenSelect.innerHTML = '';
        for (let min = 0; min < 60*4; min += 5) {
            const option = document.createElement('option');
            option.value = min;
            option.textContent = `${min} min`;
            if (min === 0) {
                option.value = "";
                option.defaultSelected = true;
                option.disabled = true;
            }
            timeTakenSelect.appendChild(option);
        }
        Init_ManualBooking_Times();
        
        renderBookings(pending, 'pending-bookings-grid' , true);
        renderBookings(completed, 'completed-bookings-grid' , false);
        renderBookings(canceled, 'canceled-bookings-grid' , false);

        const imageslider = document.getElementById('dash-slide-images');
        const placeholderImage = 'https://images.unsplash.com/photo-1749460264120-2219bc64be40?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D'; // Fallback image URL
        const images = your_salon.salonImages || []; // Fallback to empty array if images is undefined
        
        // Clear existing content and generate new slides
        imageslider.innerHTML = images.map(imageUrl => 
            `<div class="slide" style="background-image: url('${imageUrl || placeholderImage}')"></div>`
        ).join('');
        initSlider('dash-salon');

        // Start 10-second auto-reload for dashboard if logged in
        if (!dashboardReloadInterval) {
            dashboardReloadInterval = setInterval(async () => {
                if (salon_Index >= 0 && document.getElementById('your-salon').classList.contains('active')) {
                    shouldScrollOnDashboard = false; // Prevent scroll on auto-reload
                    
                    await GetYourSalon();

                    // Update dashboard data only
                    if (dashSalonName) dashSalonName.textContent = your_salon.salonName || 'N/A';
                    if (dashOwnerName) dashOwnerName.textContent = your_salon.ownerName || 'N/A';
                    if (dashOwnerNumber) dashOwnerNumber.textContent = your_salon.ownerNumber || 'N/A';
                    if (dashLocation) dashLocation.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(your_salon.location)}" target="_blank">${your_salon.location || 'N/A'}</a>`;
                    if (dashOverTime) dashOverTime.textContent = your_salon.isOverTime == true ? "Yes" : "No";
                    if (dashHours) dashHours.textContent = `${convertTo12HourFormat(your_salon.openTime) || 'N/A'} - ${convertTo12HourFormat(your_salon.closeTime) || 'N/A'}`;
                    if (dashBreaks) dashBreaks.textContent = your_salon.breaks?.length > 0 ? your_salon.breaks.map(b => `${b.from} - ${b.to}`).join(', ') : 'None';
                    if (dashServices) dashServices.textContent = your_salon.services?.length > 0 ? your_salon.services.map(s => s.name).join(', ') : 'None';

                    const salonBooking = await GetSalonBooking(your_salon.salonId , your_salon.salonName , salon_password , salon_Index , signal) || [];
                    
                    const pending = salonBooking.filter(b => b.status === 'pending');
                    const completed = salonBooking.filter(b => b.status === 'completed');
                    const canceled = salonBooking.filter(b => b.status === 'user canceled' || b.status === 'dash canceled');
                    const manualBookings = completed.filter(b => b.deviceId == 'manual');

                    const pendingBookings = document.getElementById('pending-bookings');
                    const totalBookings = document.getElementById('total-bookings');
                    const CanceledBooking = document.getElementById('canceled-bookings');
                    const CompletedBooking = document.getElementById('completed-bookings');
                    const ByWebBooking = document.getElementById('online-bookings');
                    const ManualBooking = document.getElementById('manual-bookings');

                    if (pendingBookings) pendingBookings.textContent = pending.length;
                    if (totalBookings) totalBookings.textContent = salonBooking.length;
                    if (CanceledBooking) CanceledBooking.textContent = canceled.length;
                    if (CompletedBooking) CompletedBooking.textContent = completed.length;
                    if (ByWebBooking) ByWebBooking.textContent = completed.length - manualBookings.length;
                    if (ManualBooking) ManualBooking.textContent = manualBookings.length;

                    renderBookings(pending, 'pending-bookings-grid' , true);
                    renderBookings(completed, 'completed-bookings-grid' , false);
                    renderBookings(canceled, 'canceled-bookings-grid' , false);
                }
            }, 10000);
        }

        // Scroll to top only if manually navigated
        if (shouldScrollOnDashboard) {
            requestAnimationFrame(() => {
                
                const targetSection = document.getElementById("your-salon");
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' , inline: 'center'});
            });
        }
    } else {
        // Clear interval if user is not logged in
        if (dashboardReloadInterval) {
            clearInterval(dashboardReloadInterval);
            dashboardReloadInterval = null;
        }
        // Show login form instead of dashboard
        showForm('salon-login');
        const targetSection = document.getElementById("your-salon");
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' , inline: 'center'});
    }
}
function showForm(formId , notScroll = false) {
    const forms = ['salon-loading' , 'salon-login', 'salon-register', 'salon-dashboard', 'salon-settings'];
    forms.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === formId ? 'block' : 'none';
        }
    });
    if (formId === 'salon-settings' && salon_Index >= 0) {
        populateSettings();
    }

    if(!notScroll){
        const targetSection = document.getElementById("your-salon");
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' , inline: 'center'});
    }
}
// Mock Data
let deviceId = "";
let your_salon = null;
let salons = [];
let bookings = [];
let salon_Index = -1;
let salon_name = "";
let salon_password = "";

// Initialize Data (Reset)
async function resetData() {
    salons = [
        {
            ownerName: 'Ali Khan',
            salonName: 'Style Haven',
            password: 'password123',
            location: 'Karachi',
            openTime: '09:00',
            closeTime: '18:00',
            status: "Active",
            breaks: [{ from: '12:00', to: '13:00' }],
            services: [
                { name: 'Haircut', price: 1000, time: 30 },
                { name: 'Coloring', price: 3000, time: 60 }
            ],
            ownerImage: '',
            salonImages: defaultSalonImages
        },
        {
            ownerName: 'Sara Ahmed',
            salonName: 'Elegance Salon',
            password: 'password123',
            location: 'Lahore',
            openTime: '10:00',
            closeTime: '19:00',
            status: "DeActive",
            breaks: [{ from: '13:00', to: '14:00' }],
            services: [
                { name: 'Haircut', price: 1200, time: 45 },
                { name: 'Manicure', price: 1500, time: 30 }
            ],
            ownerImage: '',
            salonImages: defaultSalonImages
        }
    ];
    bookings = [];
    salon_Index = -1;
    try {
        await setData('salons', salons);
        await setData('bookings', bookings);
        localStorage.setItem('salon_Index', salon_Index);
    } catch (e) {
        console.error('Error saving:', e);
    }
}

// Load Data
async function loadData() {
    // await resetData();
    try {
        deviceId = localStorage.getItem("Device_Id");
        if (!deviceId) {
            deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            localStorage.setItem("Device_Id", deviceId);
        }
        GetLocalDatas();
        defaultSalonImages = await getDefaultImagesData();
    } catch (e) {
        console.error('Error loading:', e);
    }
}

// Validation Helpers
function validateTimeRange(from, to) {
    if (!from || !to) return false;
    return new Date(`2000-01-01T${from}`) < new Date(`2000-01-01T${to}`);
}

// Unified function to display or clear messages with animation
function displayMessage(elementId, message = '', type = 'error') {
    const element = document.getElementById(elementId);
    const isClearing = !message;

    // Log action for debugging
    console.debug(`${isClearing ? 'Clearing' : 'Setting'} ${type} message for ID "${elementId}"${message ? `: "${message}"` : ''}`);

    let targetElement = element;
    if (!element) {
        console.warn(`Element with ID "${elementId}" not found. Creating temporary container.`);
        // Create a temporary container if element is missing
        let container = document.getElementById(`temp-message-${elementId}`);
        if (!container) {
            container = document.createElement('div');
            container.id = `temp-message-${elementId}`;
            container.style.position = 'fixed';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.zIndex = '1000';
            container.style.maxWidth = '300px';
            container.style.padding = '10px';
            container.style.borderRadius = '5px';
            container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            container.setAttribute('role', 'alert');
            container.setAttribute('aria-live', 'assertive');
            document.body.appendChild(container);
        }
        targetElement = container;
    }

    // Reset element state
    targetElement.textContent = '';
    targetElement.className = 'message'; // Reset to base class
    targetElement.style.display = 'none';
    targetElement.style.opacity = '0';
    targetElement.style.transform = 'translateY(-20px)';
    targetElement.removeAttribute('aria-hidden');

    if (isClearing) {
        return; // Stop here for clearing
    }

    // Set message and styles
    targetElement.textContent = message;
    targetElement.classList.add(type === 'error' ? 'error-message' : 'success-message');
    targetElement.classList.add('slide-in');
    targetElement.style.display = 'block';
    targetElement.style.opacity = '1';
    targetElement.style.padding = '8px';
    targetElement.style.margin = '5px 0';
    targetElement.style.borderRadius = '4px';
    targetElement.style.color = type === 'error' ? '#721c24' : '#155724';
    targetElement.style.backgroundColor = type === 'error' ? '#f8d7da' : '#d4edda';
    targetElement.style.border = type === 'error' ? '1px solid #f5c6cb' : '1px solid #c3e6cb';
    targetElement.setAttribute('role', 'alert');
    targetElement.setAttribute('aria-live', 'assertive');

    // Ensure visibility by scrolling into view
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Auto-clear all messages after 5 seconds with fade-out
    setTimeout(() => {
        if (targetElement.textContent === message) {
            targetElement.classList.remove('slide-in');
            targetElement.classList.add('fade-out');
            setTimeout(() => {
                if (targetElement.textContent === message) {
                    displayMessage(elementId); // Clear if message hasn't changed
                }
            }, 500); // Match fade-out duration
        }
    }, 5000);
}

// Clear error message for a given error element ID
function clearError(errorId) {
    displayMessage(errorId);
}

// Set error or success message for a given error element ID
function setError(errorId, message , isSuccessMessage = false) {
    // Determine message type based on content (heuristic for backward compatibility)
    const isSuccess = isSuccessMessage ||
                      message.toLowerCase().includes('success') || 
                      message.toLowerCase().includes('confirmed') || 
                      message.toLowerCase().includes('completed') || 
                      message.toLowerCase().includes('canceled');
    displayMessage(errorId, message, isSuccess ? 'success' : 'error');
}

// Login
async function loginSalon() {
    clearError('login-error');
    const salonName = document.getElementById('login-salon-name')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!salonName || !password) {
        setError('login-error', 'Please fill all required fields.');
        return;
    }
    
    setError('login-error', 'Processing...' , true);
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ salonName , "salonPassword": password }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        salon_Index = result.salon_index;
        
        if (result.status == "success" && salon_Index >= 0) {
            your_salon = salons[salon_Index];
            localStorage.setItem('salon_Index', salon_Index);
            localStorage.setItem('salon_name' , salonName);
            localStorage.setItem('salon_password' , password);
            
            GetLocalDatas();
            setError('login-error', 'Loged.' , true);
            showDashboard();
        } else {
            salon_Index = -1;
            localStorage.setItem('salon_Index', salon_Index);
            localStorage.setItem('salon_name' , "");
            localStorage.setItem('salon_password' , "");

            GetLocalDatas();
            setError('login-error', 'Invalid salon name or password.');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

// Register
async function registerSalon() {
    clearError('register-error');
    const per_code = document.getElementById('reg-permission-code')?.value.trim();
    if (!per_code) {
        setError('register-error', 'Please fill the Permission Code.');
        return;
    }
    const ownerName = document.getElementById('reg-owner-name')?.value.trim();
    const ownerNumber = document.getElementById('reg-owner-number')?.value.trim();
    const salonName = document.getElementById('reg-salon-name')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const location = document.getElementById('reg-location')?.value.trim();
    const isOverTime = document.getElementById('reg-over-time')?.checked;
    const openTime = document.getElementById('reg-open-time')?.value;
    const closeTime = document.getElementById('reg-close-time')?.value;
    const seatCount = parseInt( document.getElementById('reg-seatCount')?.value );
    let WholeServiceDiscounting = document.getElementById('reg-service-all_Discounting')?.value;

    if(!WholeServiceDiscounting){
        WholeServiceDiscounting = 0;
    }

    if (!ownerName || !ownerNumber || !salonName || !password || !location || !openTime || !closeTime) {
        setError('register-error', 'Please fill all required fields.');
        return;
    }
    if (!validateTimeRange(openTime, closeTime)) {
        setError('register-error', 'Opening time must be before closing time.');
        return;
    }

    const breaks = Array.from(document.querySelectorAll('#break-list .list-item')).map(item => ({
        from: item.querySelector('.break-from')?.value,
        to: item.querySelector('.break-to')?.value
    })).filter(b => b.from && b.to && validateTimeRange(b.from, b.to));
    if (breaks.some(b => !validateTimeRange(b.from, b.to))) {
        setError('register-error', 'All break times must have valid from-to ranges.');
        return;
    }
    const services = Array.from(document.querySelectorAll('#service-list .list-item')).map(item => ({
        name: item.querySelector('.service-name')?.value.trim(),
        price: parseFloat(item.querySelector('.service-price')?.value) || 0,
        discounted_price: parseFloat(item.querySelector('.service-discounted-price')?.value) || 0,
        time: parseInt(item.querySelector('.service-time')?.value) || 0
    })).filter(s => s.name && s.price > 0 && s.time > 0);
    if (services.length === 0) {
        setError('register-error', 'At least one valid service is required.');
        return;
    }
    if(document.getElementById('reg-seatCount')?.value == ""){
        setError('register-error', 'Please fill all required fields.');
    }
    if (!isValidPakistaniPhoneNumber(ownerNumber)) {
        setError('register-error', 'Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).');
        return;
    }
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "permissionCode": per_code, 
                                   ownerName,
                                   ownerNumber,
                                   salonName,
                                   password,
                                   location,
                                   isOverTime,
                                   openTime,
                                   closeTime,
                                   SeatCount: seatCount,
                                   breaks,
                                   WholeServiceDiscounting,
                                   services,
                                   status: "Active",
                                   ownerImage: document.getElementById('reg-owner-image')?.files[0]?.name || '',
                                   salonImages: Array.from(document.getElementById('reg-salon-image')?.files || []).map(f => f.name).length > 0 ?
                                                Array.from(document.getElementById('reg-salon-image').files).map(f => f.name) : defaultSalonImages }),

            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const status = result.status;
        if(status == "success"){
            your_salon = result.salon;

            salon_Index = result.salon_index;
            localStorage.setItem('salon_Index', salon_Index);
            localStorage.setItem('salon_name' , salonName);
            localStorage.setItem('salon_password' , password);

            GetLocalDatas();
            setError('register-error', 'Salon registered successfully!' , true);
            showDashboard();
        }else{
            setError('register-error', status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

// Populate Settings
async function populateSettings() {
    clearError('settings-error');
    await GetYourSalon();
    if (salon_Index < 0) {
        setError('settings-error', 'No salon selected. Please log in.');
        return;
    }
    const setOwnerName = document.getElementById('set-owner-name');
    const setOwnerNumber = document.getElementById('set-owner-number');
    const setSalonName = document.getElementById('set-salon-name');
    const setPassword = document.getElementById('set-password');
    const setLocation = document.getElementById('set-location');
    const setOverTime = document.getElementById('set-over-time');
    const setOpenTime = document.getElementById('set-open-time');
    const setCloseTime = document.getElementById('set-close-time');
    const setSeatCount = document.getElementById('set-seatCount');
    
    const set_WholeServiceDiscounting = document.getElementById('set-service-all_Discounting');

    if (setOwnerName) setOwnerName.value = your_salon.ownerName || '';
    if (setOwnerNumber) setOwnerNumber.value = your_salon.ownerNumber || '';
    if (setSalonName) setSalonName.value = your_salon.salonName || '';
    if (setPassword) setPassword.value = your_salon.password || '';
    if (setLocation) setLocation.value = your_salon.location || '';
    if (setSeatCount) setSeatCount.value = your_salon.SeatCount || '';
    if (setOverTime) setOverTime.checked = your_salon.isOverTime || '';
    if (setOpenTime) setOpenTime.value = your_salon.openTime || '';
    if (setCloseTime) setCloseTime.value = your_salon.closeTime || '';
    if (set_WholeServiceDiscounting) set_WholeServiceDiscounting.value = your_salon.WholeServiceDiscounting || 0;
    const breakList = document.getElementById('set-break-list');
    if (breakList) {
        breakList.innerHTML = '<h3>Break Times</h3>';
        (your_salon.breaks || []).forEach(breakTime => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <label>Break Time Range</label>
                <input type="time" class="break-from" value="${breakTime.from}" placeholder="From">
                <input type="time" class="break-to" value="${breakTime.to}" placeholder="To">
                <button class="btn" onclick="removeListItem(this)">Remove</button>
            `;
            breakList.appendChild(item);
        });
    }
    const serviceList = document.getElementById('set-service-list');
    if (serviceList) {
        let i = 1;
        serviceList.innerHTML = '<h3>Services</h3>';
        (your_salon.services || []).forEach(service => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <label>${i}.Service Details</label>
                <input type="text" class="service-name" value="${service.name}" placeholder="Service Name">
                <input type="number" class="service-price" value="${service.price}" placeholder="Price (PKR)">
                <input type="number" class="service-discounted-price" value="${service.discounted_price}" placeholder="Discounted Price (PKR)">
                <input type="number" class="service-time" value="${service.time}" placeholder="Time (min)">
                <button class="btn" onclick="removeListItem(this)">Remove</button>
            `;
            serviceList.appendChild(item);
            i += 1;
        });
    }
}

// Save Settings
async function saveSettings() {
    clearError('settings-error');
    if (salon_Index < 0) {
        setError('settings-error', 'No salon selected. Please log in.');
        return;
    }
    const ownerName = document.getElementById('set-owner-name')?.value.trim();
    const ownerNumber = document.getElementById('set-owner-number')?.value.trim();
    const salonName = document.getElementById('set-salon-name')?.value.trim();
    const password = document.getElementById('set-password')?.value;
    const location = document.getElementById('set-location')?.value.trim();
    const setSeatCount = document.getElementById('set-seatCount')?.value;
    const isOverTime = document.getElementById('set-over-time')?.checked;
    const openTime = document.getElementById('set-open-time')?.value;
    const closeTime = document.getElementById('set-close-time')?.value;
    let WholeServiceDiscounting = document.getElementById('set-service-all_Discounting')?.value;
    if(!WholeServiceDiscounting){
        WholeServiceDiscounting = 0;
    }

    if (!ownerName || !ownerNumber || !salonName || !password || !location || !setSeatCount || !openTime || !closeTime) {
        setError('settings-error', 'Please fill all required fields.');
        return;
    }
    if (!isValidPakistaniPhoneNumber(ownerNumber)) {
        setError('settings-error', 'Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).');
        return;
    }
    // if (!validateTimeRange(openTime, closeTime)) {
    //     setError('settings-error', 'Opening time must be before closing time.');
    //     return;
    // }
    const breaks = Array.from(document.querySelectorAll('#set-break-list .list-item')).map(item => ({
        from: item.querySelector('.break-from')?.value,
        to: item.querySelector('.break-to')?.value
    })).filter(b => b.from && b.to && validateTimeRange(b.from, b.to));
    if (breaks.some(b => !validateTimeRange(b.from, b.to))) {
        setError('settings-error', 'All break times must have valid from-to ranges.');
        return;
    }
    const services = Array.from(document.querySelectorAll('#set-service-list .list-item')).map(item => ({
        name: item.querySelector('.service-name')?.value.trim(),
        price: parseFloat(item.querySelector('.service-price')?.value) || 0,
        discounted_price: parseFloat(item.querySelector('.service-discounted-price')?.value) || 0,
        time: parseInt(item.querySelector('.service-time')?.value) || 0
    })).filter(s => s.name && s.price > 0 && s.time > 0);
    if (services.length === 0) {
        setError('settings-error', 'At least one valid service is required.');
        return;
    }
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/save_your_salon_setting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            
            body: JSON.stringify({ 
                "old_salonName": localStorage.getItem('salon_name') ,
                "old_salonPassword": localStorage.getItem('salon_password') , 
                "salonIndex": localStorage.getItem('salon_Index'),
                ownerName,
                ownerNumber,
                salonName,
                password,
                location,
                isOverTime,
                openTime,
                closeTime,
                WholeServiceDiscounting,
                SeatCount : setSeatCount,
                breaks,
                services,
                status:"Active",
                ownerImage: document.getElementById('set-owner-image')?.files[0]?.name || your_salon.ownerImage,
                salonImages: document.getElementById('set-salon-image')?.files.length > 0 ? 
                    Array.from(document.getElementById('set-salon-image').files).map(f => f.name) : 
                    your_salon.salonImages
             }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        if(result.status == "success"){
            localStorage.setItem('salon_name' , salonName);
            localStorage.setItem('salon_password' , password);
            GetLocalDatas();
            setError('settings-error', 'Settings saved successfully!' , true);
            showDashboard();
        }else{
            setError('settings-error', result.status);
            your_salon = null;
            localStorage.setItem('salon_Index', -1);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

// Add/Remove List Items (Breaks and Services)
function addBreakTime(listId = 'break-list') {
    const breakList = document.getElementById(listId);
    if (!breakList) return;
    const newBreak = document.createElement('div');
    newBreak.className = 'list-item';
    newBreak.innerHTML = `
        <label>Break Time Range</label>
        <input type="time" class="break-from" placeholder="From">
        <input type="time" class="break-to" placeholder="To">
        <button class="btn" onclick="removeListItem(this)">Remove</button>
    `;
    breakList.appendChild(newBreak);
}

function addService(listId = 'service-list') {
    const serviceList = document.getElementById(listId);
    if (!serviceList) return;
    const newService = document.createElement('div');
    newService.className = 'list-item';
    newService.innerHTML = `
        <label>Service Details</label>
        <input type="text" class="service-name" placeholder="Service Name">
        <input type="number" class="service-price" placeholder="Price (PKR)">
        <input type="number" class="service-discounted-price" placeholder="Discounted Price (PKR)">
        <input type="number" class="service-time" placeholder="Time (min)">
        <button class="btn" onclick="removeListItem(this)">Remove</button>
    `;
    serviceList.appendChild(newService);
}

function removeListItem(button) {
    if (button.parentElement) {
        button.parentElement.remove();
    }
}
function convertTo12HourFormat(time24) {
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    
    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${ampm}`;
}

function renderBookings(bookings, gridId , sort ) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        clearLoading();
        grid.innerHTML = '';
        
        // Sort bookings by actual time (earliest to latest)
        const sortedBookings = sort == true 
                            ? bookings.sort((a, b) => {
                                // Compare dates first
                                const dateA = new Date(a.date);
                                const dateB = new Date(b.date);
                                if (dateA < dateB) return -1;
                                if (dateA > dateB) return 1;

                                // If dates are equal, compare times
                                const timeA = timeToMinutes(a.time.substring(0, a.time.indexOf("s"))); // Assuming space separates time and AM/PM
                                const timeB = timeToMinutes(b.time.substring(0, b.time.indexOf("s"))); // Fixed 'a.time' to 'b.time'
                                return timeA - timeB;
                            })
                            : [...bookings].reverse();

        let index = 1;
        sortedBookings.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'booking-card';

            // ${booking.status === 'pending' && index === 0 ? "<h4>Your Next Customer</h4><hr>" : ""}
            if(booking.deviceId == "manual"){
                card.innerHTML = `
                    <div style="height: 5px;"></div>
                    <p style="font-size: 85%; text-align: center;">Booking ${index}</p>
                    <div style="height: 5px;"></div>
                    <hr>
                    <div style="height: 8px;"></div>
                    <p style="margin-left: 5px; margin-top: 5px; font-size: 82%;"><strong>Name:</strong> ${booking.customerName}${booking.customerName=="Manual" ? "" : " - Manual"}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Date:</strong> ${formatDate(booking.date)}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Time:</strong> ${booking.time.substring(0, booking.time.indexOf("s"))} - ${minutesToTime(timeToMinutes(booking.time.substring(0, booking.time.indexOf("s"))) + booking.time_take)}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Time Taken:</strong> ${booking.time_take}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Code:</strong> ${booking.code}</p>
                    <p style="margin-left: 5px; margin-bottom: 5px;font-size: 82%;"><strong>Seat:</strong> ${booking.time.substring(booking.time.indexOf("s") + 1)}</p>
                    ${booking.status === 'pending' ? `<button class="btn" onclick="dash_cancelBooking('${booking.code}')">Cancel This Booking</button>
                    <button class="btn" onclick="dash_Complete_Customer('${booking.code}')">Complete This Booking</button>` : ``}
                    <hr>
                    `;
            }else{
                card.innerHTML = `
                    <div style="height: 5px;"></div>
                    <p style="font-size: 85%; text-align: center;">Booking ${index}</p>
                    <div style="height: 5px;"></div>
                    <hr>
                    <div style="height: 8px;"></div>
                    ${booking.status === 'user canceled' ? `<strong>Canceled by User</strong>` : ""}
                    <p style="margin-left: 5px; margin-top: 5px; font-size: 82%;"><strong>Name:</strong> ${booking.customerName}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Number:</strong> ${booking.customerNumber}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Service:</strong> ${booking.service}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Price:</strong> ${booking.price}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Date:</strong> ${formatDate(booking.date)}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Time:</strong> ${booking.time.substring(0, booking.time.indexOf("s"))} - ${minutesToTime(timeToMinutes(booking.time.substring(0, booking.time.indexOf("s"))) + booking.time_take)}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Time Taken:</strong> ${booking.time_take}</p>
                    <p style="margin-left: 5px; font-size: 82%;"><strong>Code:</strong> ${booking.code}</p>
                    <p style="margin-left: 5px; margin-bottom: 5px;font-size: 82%;"><strong>Seat:</strong> ${booking.time.substring(booking.time.indexOf("s") + 1)}</p>
                    ${booking.status === 'pending' ? `<button class="btn" onclick="dash_cancelBooking('${booking.code}')">Cancel This Booking</button>
                    <button class="btn" onclick="dash_Complete_Customer('${booking.code}')">Complete This Booking</button>` : ``}
                `;
            }
            
            grid.appendChild(card);
            index += 1;
        });
    } catch (e) {
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading bookings. Please try again.</p>';
        console.error('Error rendering bookings:', e);
    }
}

// Render User Bookings (for Your Booked Salon)
async function renderUserBookings(bookings) {
    const grid = document.getElementById('bookings-grid');
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        const userBookings = bookings;
        clearLoading(); 
        grid.innerHTML = '';
        const groupedBookings = userBookings.reduce((acc, booking) => {
            if (!acc[booking.salonId]) {
                acc[booking.salonId] = {
                    ownerName: booking.ownerName,
                    location: booking.location,
                    bookings: []
                };
            }
            acc[booking.salonId].bookings.push(booking);
            return acc;
        }, {});
        Object.keys(groupedBookings).forEach((salonId, index) => {
            const { ownerName, location, bookings: salonBookings } = groupedBookings[salonId];
            const sliderId = `booked-salon-${salonId}-${index}`;
            const card = document.createElement('div');
            // Assuming salons is an array of objects and salonId is the name you're searching for
            let salon = salons.find(s => s.salonId == salonId)
            const salonImages = salon.salonImages;

            card.className = 'booking-card';
            const bookingDetails = salonBookings.map((booking, idx) =>  `
                ${booking.status == "pending" ? `
                    <div class="bookedSalon_userCard">
                    <h3 style="margin-left: 10px; padding-top: 4px;">Booking ${idx + 1}:</h3>
                    <hr>
                    <div style="height: 10px;"> </div>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Name:</strong> ${booking.customerName}</p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Phone Number:</strong> ${booking.customerNumber}</p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Service:</strong> ${booking.service}</p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Price:</strong> ${booking.price}</p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Booked Date:</strong> ${formatDate(booking.date)}</p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Booked Time:</strong> ${booking.time.substring(0, booking.time.indexOf("s"))}, Done at: ${minutesToTime(timeToMinutes(booking.time.substring(0, booking.time.indexOf("s"))) + booking.time_take)} </p>
                    <p style="margin-left: 10px;  font-size: 80%;"> <strong>Seat:</strong> ${booking.time.substring(booking.time.indexOf("s") + 1)}</p>
                    <button class="btn" onclick="cancelBooking('${booking.code}')">Cancel This Booking</button>
                    </div>
                    <br>`
                    : ''}
                `).join('');
            // <p style="margin-left: 10px;  font-size: 80%;"> <strong>Time Taken:</strong> ${booking.time_take} </p>
            // <p style="padding-left: 0.4rem; text-align: left; font-size: large; text-shadow: #111827;">${salonBookings.length > 1 ? '<strong>Bookings in: </strong>' : ''}</p>
            card.innerHTML = `
                <div style="margin-top: 7px; margin-bottom: 5px;"> </div?
                <p><b style="padding-left: 0.43rem; text-align: left; font-size: large; text-shadow: #111827;">${salon.salonName}</b></p>
                <div class="slider" data-slider-id="${sliderId}">
                    <div class="slides" id="${sliderId}">
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                    </div>
                    <button class="slider-btn prev" onclick="moveSlide('${sliderId}', -1)">❮</button>
                    <button class="slider-btn next" onclick="moveSlide('${sliderId}', 1)">❯</button>
                </div>
                <p style="padding-left: 0.43rem; font-size: 85%;"><strong>Owner:</strong> ${salon.ownerName}</p>
                <p style="padding-left: 0.43rem; font-size: 85%;"><strong>Owner Number:</strong> ${salon.ownerNumber}</p>
                <p style="padding-left: 0.43rem; font-size: 85%;"><strong>Location:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.location)}" target="_blank" style="font-size: 90%;  color: rgb(0, 157, 255);">${salon.location}</a></p>
                <hr>
                <br>
                ${bookingDetails}
            `;
            grid.appendChild(card);

            
            const imageslider = document.getElementById(sliderId);
            imageslider.innerHTML = salonImages.map(imageUrl => 
                `<div class="slide" style="background-image: url('${imageUrl || placeholderImage}')"></div>`
            ).join('');
        
            initSlider(sliderId);
            // Lazy-load images for booked salon cards
            // loadImagesForCard(card, defaultSalonImages);
        });
    } catch (e) {
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading bookings. Please try again.</p>';
        console.error('Error rendering user bookings:', e);
    }
}


// Cancel Booking as User
async function cancelBooking(code) {
    clearError('your_booking-error');
    setError('your_booking-error', 'Canceling booking...' , true);
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/user_cancel_booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId , code }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('your_booking-error', 'Booking canceled successfully.' , true);
            showSection('your-booked-salon');
        } else {
            setError('your_booking-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function dash_cancelBooking(code) {
    clearError('dashboard-error');
    setError('dashboard-error', 'Canceling booking...' , true);
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    /////////
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_cancel_booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "salonId": your_salon.salonId , "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index , code }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Set to Canceled.' , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function dash_Complete_Customer(code) {
    clearError('dashboard-error');
    setError('dashboard-error', 'Completing booking...' , true);
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }

    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_complete_booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({  "salonId": your_salon.salonId , "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index , "code": code }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Set to Completed.' , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function cancelAllBookings() {
    clearError('dashboard-error');
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    setError('dashboard-error', 'Canceling booking...' , true);
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_cancel_allBooking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({  "salonId": your_salon.salonId , "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Canceled all '+result.count+` Bookings.` , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function completeAllBookings() {
    clearError('dashboard-error');
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    setError('dashboard-error', 'Completing booking...' , true);
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_complete_allBooking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({  "salonId": your_salon.salonId , "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index}),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Set '+result.count+` Bookings to Complete` , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

async function cancelBeforeAllBookings() {
    clearError('dashboard-error');
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    setError('dashboard-error', 'Canceling booking...' , true);
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_cancel_allBeforeBooking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({  "salonId": your_salon.salonId , "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Canceled all '+result.count+` Bookings.` , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function completeBeforeAllBookings() {
    clearError('dashboard-error');
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    setError('dashboard-error', 'Completing booking...' , true);
    
    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/dash_complete_allBeforeBooking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "salonId": your_salon.salonId ,  "salonName": your_salon.salonName , "salonPassword": salon_password , "salonIndex": salon_Index }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.status == "success") {
            setError('dashboard-error', 'Set '+result.count+` Bookings to Complete` , true);
            showDashboard();
        } else {
            setError('dashboard-error', result.status);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

// Initialize
async function init() {
    const grid = document.getElementById('salon-grid');
    const clearLoading = grid ? showLoadingAnimation(grid) : () => {};
    try {
        await loadData();
        currentAbortController = new AbortController();
        await renderSalons(currentAbortController.signal);
        // Ensure salons render on slow networks by re-rendering after a delay
        setTimeout(async () => {
            if (grid && (!grid.children.length || grid.innerHTML.includes('No salons available'))) {
                console.log('Retrying salon render after delay');
                await renderSalons(currentAbortController.signal);
            }
        }, 500);
        debounceShowSection('home');
    } catch (e) {
        console.error('Error in init:', e);
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading page. Please refresh.</p>';
    } finally {
        clearLoading();
    }
}

// Run initialization
init();

// Initialize listener directly (safe way)
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('booking-service')?.addEventListener('change', Init_UserBooking_Times);
//   document.getElementById('manualBooking-timeTake')?.addEventListener('input', Init_ManualBooking_Times);
  document.getElementById('manualBooking-timeTake')?.addEventListener('change', Init_ManualBooking_Times);
});

async function Init_UserBooking_Times() {
    ////////////at in working so start
    const timeSelect = document.getElementById('booking-time');
    if (!timeSelect) return;

    const _serviceSelected = document.getElementById('booking-service')?.value;
    //service name
    const serviceSelected = _serviceSelected.substring(0, _serviceSelected.indexOf("p"));
    // serviceSelected =
    let _salonName = document.getElementById('booking-salon-name')?.textContent?.trim();
    if(_salonName.includes('(')){
        _salonName = _salonName.substring(0 , _salonName.indexOf("(") - 1)
    }
    

    if (!serviceSelected || serviceSelected === "") {
        timeSelect.innerHTML = '<option value="" disabled selected>Please first Select Service</option>';
        timeSelect.disabled = true;
        return;
    }
    timeSelect.innerHTML = '';
    
    const signal = currentAbortController?.signal;
    const buffer_minute = 5;
    let salon = null;
    let user_choice_service = 0;
    
    // Find salon and service duration
    for (let _salon of salons) {
        if (_salon.salonName === _salonName) {
            salon = _salon;
            for (let salon_service of _salon.services) {
                if (salon_service.name === serviceSelected) {
                    user_choice_service = salon_service.time;
                    break;
                }
            }
            break;
        }
    }

    if (!salon) {
        timeSelect.innerHTML = '<option value="" disabled selected>Error: Salon not found</option>';
        return;
    }

    timeSelect.innerHTML = '<option value="" disabled selected>Loading available times...</option>';

    try {
        const isOverTime = salon.isOverTime;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes(); // 12:27 PM = 747 minutes
        const openMinutes = timeToMinutes(salon.openTime); // e.g., "09:00 AM" = 540
        const closeMinutes = timeToMinutes(salon.closeTime); // e.g., "10:00 PM" = 1320

        // Check if salon is closed
        if (isOverTime == false && (currentMinutes < openMinutes - 60 || currentMinutes >= closeMinutes)) {
            timeSelect.innerHTML = '<option value="" disabled selected>SALON IS CLOSED</option>';
            return;
        }
        if (isOverTime == true && (currentMinutes < openMinutes - 60 && currentMinutes >= closeMinutes)) {
            timeSelect.innerHTML = '<option value="" disabled selected>SALON IS CLOSED</option>';
            return;
        }

        // Initialize time options
        timeSelect.innerHTML = '<option value="" disabled selected>All Available Times is Here</option>';

        // Start time: current time or open time, rounded to next 10-minute interval
        const round_minutes = 5;
        let startMinutes = currentMinutes;
        startMinutes = Math.ceil(startMinutes / round_minutes) * round_minutes; // Rounds 12:27 PM to 12:30 PM

        const breaks = salon.breaks || [];
        const bookings = await getSpecialSalonBookingData(salon.salonId , _salonName, { signal }) || [];

        let hasAvailableSlots = false;
        let over24Hourse = startMinutes < closeMinutes;
        let past_booked_time = "";
        while ((isOverTime == false && startMinutes < closeMinutes)
            || (isOverTime == true && ((over24Hourse == false && startMinutes < 1445) || (over24Hourse == true && startMinutes < closeMinutes)))) {
            const timeStr = minutesToTime(startMinutes);

            // Check if the time slot is during a break
            const isBreak = breaks.some(b => {
                const breakStart = timeToMinutes(b.from);
                const breakEnd = timeToMinutes(b.to);
                return startMinutes >= breakStart && startMinutes < breakEnd;
            });
            
            // New variable to track booked start times with buffer only
            let Booked_Count = 0;
            for (let _booking of bookings) {
                const bookingStart = timeToMinutes(_booking.time.substring(0, _booking.time.indexOf("s")));
                const bookingEnd = bookingStart + _booking.time_take;

                if (startMinutes >= bookingStart && startMinutes < bookingEnd + buffer_minute) {
                    Booked_Count++;
                }
            }
            // Check seat availability over the entire service duration
            const serviceEnd = startMinutes + user_choice_service;
            let isSlotAvailable = true;
            let maxBookedSeats = 0;

            for (let checkMinutes = startMinutes; checkMinutes < serviceEnd; checkMinutes++) {
                let bookedSeat = 0;
                for (let _booking of bookings) {
                    const bookingTimeStr = _booking.time.substring(0, _booking.time.indexOf("s"));
                    const bookingStart = timeToMinutes(bookingTimeStr);
                    const bookingEnd = bookingStart + _booking.time_take;
                    if (checkMinutes >= bookingStart && checkMinutes < bookingEnd + buffer_minute) {
                        bookedSeat += 1;
                    }
                }
                maxBookedSeats = Math.max(maxBookedSeats, bookedSeat);
                if (bookedSeat >= salon.SeatCount) {
                    isSlotAvailable = false;
                    break;
                }
            }

            // Check if the service duration fits within operating hours and breaks
            const fitsSchedule = ((isOverTime && over24Hourse == false) || serviceEnd <= closeMinutes) &&
                !breaks.some(b => {
                    const breakStart = timeToMinutes(b.from);
                    const breakEnd = timeToMinutes(b.to);
                    return serviceEnd > breakStart && startMinutes < breakEnd;
                });

            if(Booked_Count >= salon.SeatCount){
                if(past_booked_time == ""){
                    past_booked_time = timeStr;
                }
            }
            else if(past_booked_time != ""){
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.textContent = `${removeLeadingZero(past_booked_time.split(' ').join('').toLowerCase())} - ${removeLeadingZero(timeStr.split(' ').join('').toLowerCase())} : Booked`;
                timeSelect.appendChild(option);
                past_booked_time = "";
            }
            if (!isBreak && isSlotAvailable && fitsSchedule && maxBookedSeats < salon.SeatCount && Booked_Count < salon.SeatCount) {
                const option = document.createElement('option');
                option.value = timeStr + "s" + (Booked_Count + 1);
                option.textContent = `${removeLeadingZero(timeStr)} : Seats (${Booked_Count}/${salon.SeatCount})`;
                timeSelect.appendChild(option);
                hasAvailableSlots = true;
            }

            startMinutes += 5; // Increment by 10 minutes
            if(startMinutes >= 1445){
                startMinutes = 0;
                over24Hourse = true;
            }
        }

        if (!hasAvailableSlots) {
            timeSelect.innerHTML = '<option value="" disabled selected>No available time slots</option>';
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Error fetching bookings:', e);
            timeSelect.innerHTML = '<option value="" disabled selected>Error loading time slots</option>';
        }
    }
    timeSelect.disabled = false;
}
async function Init_ManualBooking_Times() {

    const timeSelect = document.getElementById('manual-booking-time');
    if (!timeSelect) return;

    const timeTakeInput = document.getElementById('manualBooking-timeTake')?.value;
    if (timeTakeInput == "") {
        timeSelect.innerHTML = '<option value="" disabled selected>Please first Select Time taken</option>';
        return;
    }
    const user_choice_service = parseInt(timeTakeInput);
    
    const signal = currentAbortController?.signal;
    const buffer_minute = 5;

    timeSelect.innerHTML = '<option value="" disabled selected>Loading available times...</option>';

    try {
        const isOverTime = your_salon.isOverTime;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes(); 
        const openMinutes = timeToMinutes(your_salon.openTime);
        const closeMinutes = timeToMinutes(your_salon.closeTime) + 120;

        // Check if your_salon is closed
        if (isOverTime == false && (currentMinutes < openMinutes - 60 || currentMinutes >= closeMinutes)) {
            timeSelect.innerHTML = '<option value="" disabled selected>SALON IS CLOSED</option>';
            return;
        }
        if (isOverTime == true && (currentMinutes < openMinutes - 60 && currentMinutes >= closeMinutes)) {
            timeSelect.innerHTML = '<option value="" disabled selected>SALON IS CLOSED</option>';
            return;
        }

        // Initialize time options
        timeSelect.innerHTML = '<option value="" disabled selected>All Available Times is Here</option>';

        // Start time: current time or open time, rounded to next 10-minute interval
        const round_minutes = 5;
        let startMinutes = currentMinutes;
        startMinutes = Math.ceil(startMinutes / round_minutes) * round_minutes; // Rounds 12:27 PM to 12:30 PM

        const breaks = your_salon.breaks || [];
        const bookings = await getSpecialSalonBookingData(your_salon.salonId , your_salon.salonName, { signal }) || [];

        let hasAvailableSlots = false;

        let over24Hourse = startMinutes < closeMinutes;
        let past_booked_time = "";
        while ((isOverTime == false && startMinutes < closeMinutes)
            || (isOverTime == true && ((over24Hourse == false && startMinutes < 1445) || (over24Hourse == true && startMinutes < closeMinutes)))) {
            const timeStr = minutesToTime(startMinutes);

            // Check if the time slot is during a break
            const isBreak = breaks.some(b => {
                const breakStart = timeToMinutes(b.from);
                const breakEnd = timeToMinutes(b.to);
                return startMinutes >= breakStart && startMinutes < breakEnd;
            });
            
            // New variable to track booked start times with buffer only
            let Booked_Count = 0;
            for (let _booking of bookings) {
                const bookingStart = timeToMinutes(_booking.time.substring(0, _booking.time.indexOf("s")));
                const bookingEnd = bookingStart + _booking.time_take;

                if (startMinutes >= bookingStart && startMinutes < bookingEnd + buffer_minute) {
                    Booked_Count++;
                }
            }
            // Check seat availability over the entire service duration
            const serviceEnd = startMinutes + user_choice_service;
            let isSlotAvailable = true;
            let maxBookedSeats = 0;

            for (let checkMinutes = startMinutes; checkMinutes < serviceEnd; checkMinutes++) {
                let bookedSeat = 0;
                for (let _booking of bookings) {
                    const bookingTimeStr = _booking.time.substring(0, _booking.time.indexOf("s"));
                    const bookingStart = timeToMinutes(bookingTimeStr);
                    const bookingEnd = bookingStart + _booking.time_take;
                    if (checkMinutes >= bookingStart && checkMinutes < bookingEnd + buffer_minute) {
                        bookedSeat += 1;
                    }
                }
                maxBookedSeats = Math.max(maxBookedSeats, bookedSeat);
                if (bookedSeat >= your_salon.SeatCount) {
                    isSlotAvailable = false;
                    break;
                }
            }

            // Check if the service duration fits within operating hours and breaks
            const fitsSchedule = ((isOverTime && over24Hourse == false) || serviceEnd <= closeMinutes) &&
                !breaks.some(b => {
                    const breakStart = timeToMinutes(b.from);
                    const breakEnd = timeToMinutes(b.to);
                    return serviceEnd > breakStart && startMinutes < breakEnd;
                });

            if(Booked_Count >= your_salon.SeatCount){
                if(past_booked_time == ""){
                    past_booked_time = timeStr;
                }
            }
            else if(past_booked_time != ""){
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.textContent = `${removeLeadingZero(past_booked_time.split(' ').join('').toLowerCase())} - ${removeLeadingZero(timeStr.split(' ').join('').toLowerCase())} : Booked`;
                timeSelect.appendChild(option);
                past_booked_time = "";
            }

            if (!isBreak && isSlotAvailable && fitsSchedule && maxBookedSeats < your_salon.SeatCount && Booked_Count < your_salon.SeatCount) {
                const option = document.createElement('option');
                option.value = timeStr + "s" + (Booked_Count + 1);
                option.textContent = `${removeLeadingZero(timeStr)} : Seats (${Booked_Count}/${your_salon.SeatCount})`;
                timeSelect.appendChild(option);
                hasAvailableSlots = true;
            }

            startMinutes += 5; // Increment by 10 minutes
            if(startMinutes >= 1445){
                startMinutes = 0;
                over24Hourse = true;
            }
        }

        if (!hasAvailableSlots) {
            timeSelect.innerHTML = '<option value="" disabled selected>No available time slots</option>';
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Error fetching bookings:', e);
            timeSelect.innerHTML = '<option value="" disabled selected>Error loading time slots</option>';
        }
    }
    timeSelect.disabled = false;
}
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Book Appointment
async function bookAppointment() {
    clearError('booking-error');
    
    setError('booking-error', 'Booking in Proccessing.' , true);
    const _service = document.getElementById('booking-service')?.value;
    const time = document.getElementById('booking-time')?.value;
    const customerName = document.getElementById('customer-name')?.value.trim();
    const customerNumber = document.getElementById('customer-number')?.value.trim();
    let _salonName = document.getElementById('booking-salon-name')?.textContent || '';
    if(_salonName.includes('(')){
        _salonName = _salonName.substring(0 , _salonName.indexOf("(") - 1)
    }
    
    if (!customerName) {
        setError('booking-error', 'Please add your Name.');
        return;
    }
    if (!customerNumber) {
        setError('booking-error', 'Please add your Phone Number.');
        return;
    }
    if (!isValidPakistaniPhoneNumber(customerNumber)) {
        setError('booking-error', 'Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).');
        return;
    }
    if (!_service || _service.value == "") {
        setError('booking-error', 'Please select a service.');
        return;
    }
    if (!time || time.value == "") {
        setError('booking-error', 'Please select a Timing.');
        return;
    }

    //service name
    const service = _service.substring(0, _service.indexOf("p"));
    //service price
    const price = _service.substring(_service.indexOf("p") + 1);
    let salon = null;
    let time_take = 0;
    for (let _salon of salons) {
        if (_salon.salonName === _salonName) {
            salon = _salon;
            for (let salon_service of _salon.services) {
                if (salon_service.name === service) {
                    time_take = salon_service.time;
                    break;
                }
            }
            break;
        }
    }

    const breaks = salon.breaks || [];
    let bookings = await getSpecialSalonBookingData(salon.salonId , _salonName) || [];
    const r = checkTimeSlotAvailability(salon , bookings , breaks , time.substring(0 , time.indexOf('s')) , time_take);
    if(r == "failed"){
        setError("booking-error" , 'Failed: Another Person Booked this Time');
        Init_UserBooking_Times();
        return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let book_time_min = timeToMinutes(time.substring(0 , time.indexOf('s')));
    let salon_closed_min = timeToMinutes(salon.closeTime);
    let nextDayDate = (book_time_min >= 0 && book_time_min < salon_closed_min)
                   && (currentMinutes > salon_closed_min && currentMinutes < 1445);

    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/bookAppointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "salonId": salon.salonId , 
                                    // "salonName": _salonName,
                                    // "ownerName": document.getElementById('booking-owner-name')?.textContent.replace('"Owner": ', '') || '',
                                    // "location": document.getElementById('booking-location')?.textContent || '',
                                    "deviceId": localStorage.getItem("Device_Id") || '',
                                    service ,
                                    price ,
                                    "nextDayDate": nextDayDate == true ? "1":"0",
                                    time,
                                    time_take,
                                    "customerImage": '',
                                    "customerName": customerName,
                                    "customerNumber": customerNumber }),

            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const status = result.status;
        if(status == "success"){
            setError('your_booking-error', 'Booking confirmed!' , true);
            showSection('your-booked-salon')
        }else{
            setError('booking-error', 'Failed to book appointment. Please try again.');
            console.error('Error booking appointment:');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

async function manualBook() {
    clearError('manual-dashboard-error');
    const customerName = document.getElementById('manualBooking-customer-name')?.value;
    const time_take = document.getElementById('manualBooking-timeTake')?.value;
    const selected_time = document.getElementById('manual-booking-time')?.value;

    // Validate input
    if (!time_take) {
        setError("manual-dashboard-error" , 'Please enter how much time the service takes.');
        return;
    }
    if (time_take == 0) {
        setError("manual-dashboard-error" , 'Please enter how much time the service takes.');
        return;
    }
    
    const user_choice_service = parseInt(time_take);
    if (isNaN(user_choice_service) || user_choice_service <= 0) {
        setError("manual-dashboard-error" , 'Please enter a valid service duration.');
        return;
    }
    
    if (!your_salon) {
        setError("manual-dashboard-error" , 'No salon selected. Please select a salon first.');
        return;
    }
    setError("manual-dashboard-error" , 'Checking availability...');

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 04:49 PM = 1009 minutes

    let _time = "";
    let curTime = false;
    if(selected_time && selected_time != ""){
        _time = selected_time;
        curTime = false;
    }
    else{
        
        const timeStr = minutesToTime(currentMinutes);
        _time = timeStr + "s";
        curTime = true;
    }
    const breaks = your_salon.breaks || [];
    const bookings = await getSpecialSalonBookingData(your_salon.salonId , your_salon.salonName) || [];
    const r = checkTimeSlotAvailability(your_salon , bookings , breaks , _time.substring(0 , _time.indexOf('s')) , user_choice_service);
    if(r == "failed"){
        setError("manual-dashboard-error" , 'Failed: Another Person Booked this Time');
        Init_ManualBooking_Times();
        return;
    }
    if(curTime){
        _time += r.toString();
    }

    let book_time_min = timeToMinutes(_time.substring(0 , _time.indexOf('s')));
    let salon_closed_min = timeToMinutes(your_salon.closeTime);
    let nextDayDate = (book_time_min >= 0 && book_time_min < salon_closed_min)
                   && (currentMinutes > salon_closed_min && currentMinutes < 1445);

    const Signal = currentAbortController.signal;
    try {
        const { signal } = Signal;
        const response = await fetch(`${BASE_URL}/bookAppointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "salonId": your_salon.salonId , "salonName": your_salon.salonName,
                                    "ownerName": your_salon.ownerName,
                                    "location": your_salon.location,
                                    "deviceId": 'manual',
                                    "service": "Manual Booking",
                                    "nextDayDate": nextDayDate == true ? "1":"0",
                                    "time": curTime == true ? _time + r.toString() : _time,
                                    "time_take": user_choice_service,
                                    "customerImage": '',
                                    "customerName": customerName == "" ? "Manual" : customerName,
                                    "customerNumber": "0000",
                                    "code": 'BOOK' + Math.random().toString(36).substring(2, 8),
                                    "date": new Date().toISOString().split('T')[0], }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const status = result.status;
        if(status == "success"){
            setError('manual-dashboard-error', 'Manual booking confirmed!' , true);
            showDashboard();
        }else{
            setError('manual-dashboard-error', 'Failed to book appointment. Please try again.');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
function checkTimeSlotAvailability(salon, bookings, breaks, time, serviceDuration) {
    // Validate inputs
    if (!salon || !time || !bookings || !breaks) {
        return "Invalid input parameters";
    }
    
    // const now = new Date();
    // const currentMinutes = now.getHours() * 60 + now.getMinutes(); // 03:37 PM = 1037 minutes
    // const openMinutes = timeToMinutes(salon.openTime);
    // const closeMinutes = timeToMinutes(salon.closeTime);
    
    // // Validate time format and range
    // if (isNaN(requestedMinutes) || requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
    //     return "Salon closed";
    // }

    // // Check if salon is closed based on current time
    // if (currentMinutes < openMinutes - 60 || currentMinutes >= closeMinutes)) {
    //     return "Salon closed";
    // }

    const requestedMinutes = timeToMinutes(time);

    // Determine service duration
    let user_choice_service = serviceDuration;
    const serviceEnd = requestedMinutes + user_choice_service;
    
    // Check if the slot fits within operating hours and breaks
    // if (serviceEnd > closeMinutes) {
    //     return "Slot exceeds closing time";
    // }
    if (breaks.some(b => {
        const breakStart = timeToMinutes(b.from);
        const breakEnd = timeToMinutes(b.to);
        return requestedMinutes < breakEnd && serviceEnd > breakStart;
    })) {
        return "Slot overlaps with a break";
    }

    // Check seat availability over the service duration
    let isSlotAvailable = true;
    let maxBookedSeats = 0;

    for (let checkMinutes = requestedMinutes; checkMinutes < serviceEnd; checkMinutes += 5) {
        let bookedSeat = 0;
        for (let _booking of bookings) {
            const bookingTimeStr = _booking.time.substring(0, _booking.time.indexOf("s"));
            const bookingStart = timeToMinutes(bookingTimeStr);
            const bookingEnd = bookingStart + _booking.time_take;
            if (checkMinutes >= bookingStart && checkMinutes < bookingEnd + 5) { // 5-minute buffer
                bookedSeat += 1;
            }
        }
        maxBookedSeats = Math.max(maxBookedSeats, bookedSeat);
        if (bookedSeat >= salon.SeatCount) {
            isSlotAvailable = false;
            break;
        }
    }

    // Check booked count at the start time
    let Booked_Count = 0;
    for (let _booking of bookings) {
        const bookingStart = timeToMinutes(_booking.time.substring(0, _booking.time.indexOf("s")));
        const bookingEnd = bookingStart + _booking.time_take;
        if (requestedMinutes >= bookingStart && requestedMinutes < bookingEnd + 5) {
            Booked_Count++;
        }
    }

    if (!isSlotAvailable || maxBookedSeats >= salon.SeatCount || Booked_Count >= salon.SeatCount) {
        return "failed";
    }

    return Booked_Count + 1;
}

async function RunSpecialPaths(id , options = {}) {
    try {
        const { signal } = options;
        const response = await fetch(`${BASE_URL}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        const data = result.data;
        
        if (data === null) {
            return null;
        }

        const convertedData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
            ? Object.values(data)
            : data;

        return convertedData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path: ${id}`);
            throw error;
        }
        console.error(`Error fetching data from ${id}:`, error);
        throw error;
    }
}
async function GetUserBooking(deviceId, options = {}) {
    try {
        const { signal } = options;
        const response = await fetch(`${BASE_URL}/getUserBookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const data = result.data;
        
        if (data === null) {
            return null;
        }

        const convertedData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
            ? Object.values(data)
            : data;

        return convertedData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}

async function GetSalonBooking(salonId , salonName , salon_password , salon_Index, options = {}) {
    try {
        const { signal } = options;
        const response = await fetch(`${BASE_URL}/getSalonBookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "salonId": salonId , salonName  , "salonPassword": salon_password , "salonIndex": salon_Index }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const data = result.data;
        
        if (data === null) {
            return null;
        }

        const convertedData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
            ? Object.values(data)
            : data;

        return convertedData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
async function getSpecialSalonBookingData(salonId , salonName, options = {}) {
    try {
        const { signal } = options;
        const response = await fetch(`${BASE_URL}/getOnlyTime_SalonBookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ salonId , salonName }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        const data = result.data;
        
        if (data === null) {
            return null;
        }

        const convertedData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
            ? Object.values(data)
            : data;

        return convertedData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for`);
            throw error;
        }
        console.error(`Error fetching data:`, error);
        throw error;
    }
}
async function getDefaultImagesData(options = {}) {
    try {
        const { signal } = options;
        const response = await fetch(`${BASE_URL}/getDefaultImages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ }),
            signal
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        const data = result.data;
        
        if (data === null) {
            return null;
        }

        const convertedData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
            ? Object.values(data)
            : data;

        return convertedData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Fetch aborted for path:`);
            throw error;
        }
        console.error(`Error fetching data from:`, error);
        throw error;
    }
}
function formatDate(dateStr) {
    let date = new Date(dateStr);
    let day = date.getDate().toString().padStart(2, '0');
    let month = date.toLocaleString('en-US', { month: 'long' });
    let year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
function removeLeadingZero(timeStr) {
    // Replace leading zero in the hour part
    return timeStr.replace(/^0(\d):/, '$1:');
}
