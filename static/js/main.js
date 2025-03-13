let currentIndex = 0;
let totalCount = 0;

document.addEventListener("DOMContentLoaded", function() {
    // Load the total number of data points first
    fetch('/api/datapoints/count')
        .then(response => response.json())
        .then(data => {
            totalCount = data.count;
            if (totalCount > 0) {
                loadDataPoint(currentIndex);
            } else {
                displayStatus("No data points found.", "danger");
            }
        });

    document.getElementById("prevBtn").addEventListener("click", function() {
        if (currentIndex > 0) {
            currentIndex--;
            loadDataPoint(currentIndex);
        } else {
            displayStatus("This is the first data point.", "warning");
        }
    });

    document.getElementById("nextBtn").addEventListener("click", function() {
        if (currentIndex < totalCount - 1) {
            currentIndex++;
            loadDataPoint(currentIndex);
        } else {
            displayStatus("This is the last data point.", "warning");
        }
    });

    document.getElementById("jumpBtn").addEventListener("click", function() {
        let indexInput = document.getElementById("indexInput").value;
        let index = parseInt(indexInput);
        if (!isNaN(index) && index >= 0 && index < totalCount) {
            currentIndex = index;
            loadDataPoint(currentIndex);
        } else {
            displayStatus("Invalid index number.", "danger");
        }
    });

    document.getElementById("saveVerificationBtn").addEventListener("click", function() {
        let verifiedAnswer = document.getElementById("verifiedAnswer").value;
        let verifier = document.getElementById("verifierName").value;
        let verificationStatus = document.getElementById("verificationStatus").value;
        if (!verifier) {
            displayStatus("Please enter verifier name.", "danger");
            return;
        }
        updateDataPoint({ 
            verified_response: verifiedAnswer, 
            verifier: verifier, 
            verification_status: verificationStatus 
        });
    });

    document.getElementById("deleteBtn").addEventListener("click", function() {
        if (confirm("Are you sure you want to delete this data point?")) {
            deleteDataPoint();
        }
    });

    document.getElementById("exportBtn").addEventListener("click", function() {
        window.location.href = "/export";
    });
});

function loadDataPoint(index) {
    fetch(`/api/datapoints/${index}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Data point not found");
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("dataIndex").innerText = "Index: " + index;
            // Populate ChatGPT answer (read-only)
            document.getElementById("chatgptAnswer").value = data.datapoint.gpt_response || "";
            // Pre-populate Verified Answer with existing verified response or fallback to ChatGPT answer
            document.getElementById("verifiedAnswer").value = data.datapoint.verified_response || data.datapoint.gpt_response || "";
            // Populate verifier and status if already provided
            document.getElementById("verifierName").value = data.datapoint.verifier || "";
            document.getElementById("verificationStatus").value = data.datapoint.verification_status || "accepted";
            // Load image (assumes images are in /static/images)
            let imageName = data.datapoint.image;
            if (imageName) {
                document.getElementById("dataImage").src = `/static/images/${imageName}`;
            } else {
                document.getElementById("dataImage").src = "";
            }
            displayStatus("Data loaded.", "success");
        })
        .catch(error => {
            console.error(error);
            displayStatus("Error loading data point.", "danger");
        });
}

function updateDataPoint(updateFields) {
    fetch(`/api/datapoints/${currentIndex}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updateFields)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayStatus("Update failed: " + data.error, "danger");
        } else {
            displayStatus("Data point updated successfully.", "success");
            loadDataPoint(currentIndex);
        }
    })
    .catch(error => {
        console.error(error);
        displayStatus("Error updating data point.", "danger");
    });
}

function deleteDataPoint() {
    fetch(`/api/datapoints/${currentIndex}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayStatus("Delete failed: " + data.error, "danger");
        } else {
            displayStatus("Data point deleted successfully.", "success");
            // Refresh total count and adjust current index if needed.
            fetch('/api/datapoints/count')
                .then(response => response.json())
                .then(data => {
                    totalCount = data.count;
                    if (currentIndex >= totalCount) {
                        currentIndex = totalCount - 1;
                    }
                    if (totalCount > 0) {
                        loadDataPoint(currentIndex);
                    } else {
                        clearDataDisplay();
                    }
                });
        }
    })
    .catch(error => {
        console.error(error);
        displayStatus("Error deleting data point.", "danger");
    });
}

function displayStatus(message, type) {
    let statusMsg = document.getElementById("statusMsg");
    statusMsg.innerText = message;
    statusMsg.className = "";
    if (type === "success") {
        statusMsg.classList.add("text-success");
    } else if (type === "danger") {
        statusMsg.classList.add("text-danger");
    } else if (type === "warning") {
        statusMsg.classList.add("text-warning");
    }
}

function clearDataDisplay() {
    document.getElementById("dataIndex").innerText = "No data available";
    document.getElementById("chatgptAnswer").value = "";
    document.getElementById("verifiedAnswer").value = "";
    document.getElementById("dataImage").src = "";
}
