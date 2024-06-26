const healthChart = new Chart(
    document.getElementById('healthChart'),
    {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Systolic',
                    data: [],
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    fill: false,
                    lineTension: 0.1
                },
                {
                    label: 'Diastolic',
                    data: [],
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.2)',
                    fill: false,
                    lineTension: 0.1
                },
                {
                    label: 'Weight',
                    data: [],
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 128, 0, 0.2)',
                    fill: false,
                    lineTension: 0.1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'black'
                    }
                }
            },
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Health Data',
                    font: {
                        size: 24
                    }
                }
            }
        }
    }
);

function getSelectedRange() {
    return parseInt(localStorage.getItem('selectedRange')) || 90;
}

function setRange(days) {
    localStorage.setItem('selectedRange', days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const storedData = JSON.parse(localStorage.getItem('healthData') || '[]');
    const filteredData = storedData.filter(item => new Date(item.date) >= startDate);

    const labels = filteredData.map(item => item.date);
    const systolicData = [];
    const diastolicData = [];
    const weightData = [];

    let prevSystolic, prevDiastolic, prevWeight;

    for (const item of filteredData) {
        const { date, systolic, diastolic, weight } = item;

        if (systolic !== null) {
            systolicData.push(systolic);
            prevSystolic = systolic;
        } else {
            systolicData.push(prevSystolic || null);
        }

        if (diastolic !== null) {
            diastolicData.push(diastolic);
            prevDiastolic = diastolic;
        } else {
            diastolicData.push(prevDiastolic || null);
        }

        if (weight !== null) {
            weightData.push(weight);
            prevWeight = weight;
        } else {
            weightData.push(prevWeight || null);
        }
    }

    healthChart.data.labels = labels;
    healthChart.data.datasets[0].data = systolicData;
    healthChart.data.datasets[1].data = diastolicData;
    healthChart.data.datasets[2].data = weightData;
    healthChart.options.plugins.title.text = `Health Data for ${days} Days`;
    healthChart.update();

    highlightButton(days);
}

function highlightButton(days) {
    document.querySelectorAll('.button-container button').forEach(button => {
        button.classList.remove('active-button');
    });

    const selectedButton = document.getElementById(`button${days}`);
    if (selectedButton) {
        selectedButton.classList.add('active-button');
    }
}

function populateTable(data) {
    const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    data.forEach(item => {
        const row = document.createElement('tr');
        const dateCell = document.createElement('td');
        const bpCell = document.createElement('td');
        const weightCell = document.createElement('td');
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');

        dateCell.innerHTML = `<a href="#" onclick="loadData('${item.date}')">${formatDateForDisplay(new Date(item.date))}</a>`;
        bpCell.textContent = `${item.systolic || ''}/${item.diastolic || ''}`;
        weightCell.textContent = item.weight || '';
        deleteButton.textContent = 'X';
        deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
        deleteButton.onclick = () => deleteRecord(item.date);

        deleteCell.appendChild(deleteButton);

        row.appendChild(dateCell);
        row.appendChild(bpCell);
        row.appendChild(weightCell);
        row.appendChild(deleteCell);

        tableBody.appendChild(row);
    });
}

const storedData = JSON.parse(localStorage.getItem('healthData') || '[]');
let selectedRange = getSelectedRange();

setRange(selectedRange);
populateTable(storedData); // Always show all records in the table

const form = document.getElementById('healthForm');
form.addEventListener('submit', function (event) {
    event.preventDefault();

    const systolic = document.getElementById('systolic').value;
    const diastolic = document.getElementById('diastolic').value;
    const weight = document.getElementById('weight').value;
    const date = document.getElementById('date').value;

    const existingDataIndex = storedData.findIndex(item => item.date === date);

    if (existingDataIndex >= 0) {
        storedData[existingDataIndex] = {
            date,
            systolic,
            diastolic,
            weight
        };
        showAlert('Record Added');
    } else {
        storedData.push({
            date,
            systolic,
            diastolic,
            weight
        });
        showAlert('Record Updated');
    }

    localStorage.setItem('healthData', JSON.stringify(storedData));

    // POST the fresh data to the endpoint if conditions are met
    postDataToEndpoint(storedData);

    selectedRange = getSelectedRange();
    setRange(selectedRange);
    populateTable(storedData); // Refresh the table to show all records

    setFieldColors();
});

function formatDate(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + (date.getDate() + 1)).slice(-2); // Adjusted to handle timezone offset
    return `${month}/${day}/${year}`;
}

function loadExistingData() {
    const currentDate = formatDate(new Date());
    const existingData = storedData.find(item => item.date === currentDate);

    document.getElementById('date').value = currentDate;

    if (existingData) {
        document.getElementById('systolic').value = existingData.systolic;
        document.getElementById('diastolic').value = existingData.diastolic;
        document.getElementById('weight').value = existingData.weight;
        form.querySelector('input[type="submit"]').value = 'Add/Update';
        setFieldColors(true);
    } else {
        setFieldColors(false);
    }
}

function loadData(date) {
    const existingData = storedData.find(item => item.date === date);

    if (existingData) {
        document.getElementById('date').value = existingData.date;
        document.getElementById('systolic').value = existingData.systolic;
        document.getElementById('diastolic').value = existingData.diastolic;
        document.getElementById('weight').value = existingData.weight;
        form.querySelector('input[type="submit"]').value = 'Add/Update';
        setFieldColors(true);
    }
}

function deleteRecord(date) {
    const index = storedData.findIndex(item => item.date === date);
    if (index !== -1) {
        storedData.splice(index, 1);
        localStorage.setItem('healthData', JSON.stringify(storedData));

        // POST the fresh data to the endpoint if conditions are met
        postDataToEndpoint(storedData);

        selectedRange = getSelectedRange();
        setRange(selectedRange);
        populateTable(storedData);
        showAlert('Record Deleted');
    } else {
        showAlert('Record does not exist');
    }
}

function setFieldColors(isEditing = false) {
    const inputs = document.querySelectorAll('#healthForm .form-control');
    inputs.forEach(input => {
        input.classList.remove('new-record', 'editing-record');
        input.classList.add(isEditing ? 'editing-record' : 'new-record');
    });
}

function showAlert(message) {
    const alertContainer = document.getElementById('alertContainer');
    const alertMessage = document.getElementById('alertMessage');

    alertMessage.textContent = message;
    alertContainer.style.display = 'block';

    // Automatically hide the alert after 3 seconds
    setTimeout(() => {
        closeAlert();
    }, 3000);
}

function closeAlert() {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.classList.remove('show'); // Close the alert
    setTimeout(() => {
        // alertContainer.style.display = 'none';
    }, 150); // Match this to the Bootstrap transition duration
}

function compressData(data) {
    const jsonString = JSON.stringify(data);
    // const compressedData = LZString.compressToUTF16(jsonString);
    const compressedData = LZString.compressToUTF16(jsonString);
    return compressedData;
}

function postDataToEndpoint(data) {
    const endpoint = localStorage.getItem("salesforceEndpoint");
    const environment = localStorage.getItem("environment");
    const compressedData = compressData(data);

    let requestBody = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'environment': environment,
            'compressedData': compressedData
        })
    }

    if (endpoint && environment) {
        fetch(endpoint, requestBody)
            .then(response => {
                response.json()
            })
            .then(data => {
                console.log('Success:', data)
            })
            .catch((error) => {
                console.error('Error:', error)
            });
    } else {
        console.warn("Endpoint or environment not set in localStorage");
    }
}

loadExistingData();

// Resize chart when Chart tab is shown
document.getElementById('chart-tab').addEventListener('shown.bs.tab', function (e) {
    healthChart.resize();
});

document.addEventListener("DOMContentLoaded", function () {
    // Load endpoint and environment from localStorage
    const endpointInput = document.getElementById("salesforceEndpoint");
    const environmentInput = document.getElementById("environment");
    const retrieveBackupDataBtn = document.getElementById("retrieveBackupDataBtn");

    const savedEndpoint = localStorage.getItem("salesforceEndpoint");
    const savedEnvironment = localStorage.getItem("environment");

    if (savedEndpoint) {
        endpointInput.value = savedEndpoint;
    }

    if (savedEnvironment) {
        environmentInput.value = savedEnvironment;
    }

    // Enable the button if both fields are populated
    function checkInputs() {
        if (endpointInput.value && environmentInput.value) {
            retrieveBackupDataBtn.disabled = false;
        } else {
            retrieveBackupDataBtn.disabled = true;
        }
    }

    // Check inputs on page load
    checkInputs();

    // Add event listeners to inputs to check their values
    endpointInput.addEventListener("input", checkInputs);
    environmentInput.addEventListener("input", checkInputs);

    retrieveBackupDataBtn.addEventListener("click", function () {
        const endpoint = localStorage.getItem("salesforceEndpoint");
        const environment = localStorage.getItem("environment");

        if (!endpoint || !environment) {
            alert("Please set Salesforce Endpoint and Environment first.");
            return;
        }

        // Ensure the endpoint URL ends with a slash if it doesn't already have one
        const endpointUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
        const fetchUrl = endpointUrl + environment;

        const confirmation = confirm("This action will overwrite existing local data. Continue?");
        if (!confirmation) {
            return;
        }

        fetch(fetchUrl, {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch backup data.');
                }
                return response.clone().text();
            })
            .then(data => {
                console.log(data);
                console.log(JSON.stringify(data));
                /*
                // Decompress and parse the fetched data
                const decompressedData = LZString.decompressFromEncodedURIComponent(data.compressedData);
                if (!decompressedData) {
                    throw new Error('Failed to decompress data.');
                }
                const parsedData = JSON.parse(decompressedData);

                // Overwrite local storage with fetched data
                localStorage.setItem('healthData', JSON.stringify(parsedData));

                // Update UI to reflect fetched data
                const selectedRange = getSelectedRange();
                setRange(selectedRange);
                populateTable(parsedData);
                showAlert('Backup data retrieved successfully.');
                */
            })
            .catch(error => {
                console.error('Error fetching backup data:', error);
                alert('Failed to retrieve backup data. Check console for details.');
            });
    });


});
