// Battle Pass start

function addBattlePassLevel() {
  const level = document.getElementById("levelInput").value.trim();
  const wager = document.getElementById("wagerInput").value.trim();
  const wagerDifference = document.getElementById("wagerDiffInput").value.trim();
  const cashPrizes = document.getElementById("cashPrizesInput").value.trim() || "-";
  const rakebackBonus = document.getElementById("rakebackBonusInput").value.trim() || "-";
  const freeSpins = document.getElementById("freeSpinsInput").value.trim() || 0;

  // Validation
  if (!level || !wager || !wagerDifference) {
    alert("Level, Wager, and Wager Difference are required fields.");
    return;
  }

  // Create a new list item
  const listItem = document.createElement("li");
  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
  listItem.innerHTML = `
    Level: ${level} | Wager: $${wager} | Wager Difference: $${wagerDifference} | Cash Prizes: ${cashPrizes} | Rakeback Bonus: ${rakebackBonus} | Free Spins: ${freeSpins}
    <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">X</button>
  `;

  // Add the new level to the list
  document.getElementById("battlePassList").appendChild(listItem);

  // Clear input fields
  document.getElementById("levelInput").value = "";
  document.getElementById("wagerInput").value = "";
  document.getElementById("wagerDiffInput").value = "";
  document.getElementById("cashPrizesInput").value = "";
  document.getElementById("rakebackBonusInput").value = "";
  document.getElementById("freeSpinsInput").value = "";
}

function removeItem(button) {
  // Remove the list item
  button.parentElement.remove();
}

// Battle Pass end

//Rank up bonus start

function addRank() {
  const rankNumberInput = document.getElementById("rankNumberInput").value.trim();
  const totalWagerInput = document.getElementById("totalWagerInput").value.trim();
  const rakebackInput = document.getElementById("rakebackInput").value.trim();

  // Validation
  if (!rankNumberInput || !totalWagerInput || !rakebackInput) {
    alert("Please fill in all fields for Rank, Total Wager, and Rakeback.");
    return;
  }

  // Create a new list item
  const listItem = document.createElement("li");
  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
  listItem.innerHTML = `
    Rank: ${rankNumberInput} | Total Wager: ${totalWagerInput} | Rakeback: ${rakebackInput}
    <button type="button" class="btn btn-sm btn-danger" onclick="removeRank(this)">X</button>
  `;

  // Add the new rank to the list
  document.getElementById("rankList").appendChild(listItem);

  // Clear input fields
  document.getElementById("rankNumberInput").value = "";
  document.getElementById("totalWagerInput").value = "";
  document.getElementById("rakebackInput").value = "";
}

function removeRank(button) {
  // Remove the rank item
  const listItem = button.parentElement;
  listItem.remove();
}

//Rank up bonus end

// Calendar Bonus Logic start
function setDistributionDays() {
  const days = document.getElementById("distributionDays").value.trim();
  if (!days || isNaN(days)) {
    alert("Please enter a valid number of days.");
    return;
  }

  document.getElementById("distributionDisplay").innerText = `Current Distribution Days: ${days}`;
}

function setTimeSplits() {
  const morning = document.getElementById("morningSplit").value.trim() || "33.33";
  const afternoon = document.getElementById("afternoonSplit").value.trim() || "33.33";
  const evening = document.getElementById("eveningSplit").value.trim() || "33.33";

  if (parseFloat(morning) + parseFloat(afternoon) + parseFloat(evening) !== 100) {
    alert("The total of Morning, Afternoon, and Evening splits must equal 100%.");
    return;
  }
  
  document.getElementById("timeSplitDisplay").innerText = `Current Splits: Morning: ${morning}%, Afternoon: ${afternoon}%, Evening: ${evening}%`;  
}

// Calendar Bonus end

// page 
async function saveConfig() {
  // Collect Base Rakeback data
  const baseRakeback = {
    bonusId: 1, // Static ID for example, replace with actual bonus ID if dynamic
    percentage: parseFloat(document.getElementById("baseRakebackPercentage").value),
    claimCooldownMinutes: parseInt(document.getElementById("baseRakebackCooldown").value, 10),
  };

  // Collect RakeBoost data
  const rakeBoost = {
    bonusId: 1,
    bonusPercentage: parseFloat(document.getElementById("rakeBoostPercentage").value),
    durationHours: parseInt(document.getElementById("rakeBoostDuration").value, 10),
    triggerActivity: document.getElementById("rakeBoostActivities").value,
  };

  // Collect Daily Bonus data
  const dailyBonus = {
    bonusId: 1,
    percentage: parseFloat(document.getElementById("dailyBonusPercentage").value),
    maxAccumulationDays: parseInt(document.getElementById("dailyBonusMaxDays").value, 10),
    immediateClaimPercentage: parseFloat(document.getElementById("dailyBonusImmediateClaim").value),
    calendarClaimPercentage: parseFloat(document.getElementById("dailyBonusCalendarClaim").value),
  };

  // Collect Weekly Bonus data
  const weeklyBonus = {
    bonusId: 1,
    percentage: parseFloat(document.getElementById("weeklyBonusPercentage").value),
    immediateClaimPercentage: parseFloat(document.getElementById("weeklyBonusImmediateClaim").value),
    calendarClaimPercentage: parseFloat(document.getElementById("weeklyBonusCalendarClaim").value),
  };

  // Collect Monthly Bonus data
  const monthlyBonus = {
    bonusId: 1,
    percentage: parseFloat(document.getElementById("monthlyBonusPercentage").value),
    immediateClaimPercentage: parseFloat(document.getElementById("monthlyBonusImmediateClaim").value),
    calendarClaimPercentage: parseFloat(document.getElementById("monthlyBonusCalendarClaim").value),
  };

  // Collect Rank Up Bonus data
  const rankUpBonus = Array.from(document.querySelectorAll("#rankList li")).map((item) => {
    const parts = item.innerText.split(" | ");
    return {
      bonusId: 1,
      rank: parseInt(parts[0].split(": ")[1], 10),
      totalWager: parseFloat(parts[1].split(": ")[1].replace(/\D/g, "")),
      rakeback: parseFloat(parts[2].split(": ")[1].replace("%", "")),
    };
  });

  // Collect Battle Pass data
  const battlePass = Array.from(document.querySelectorAll("#battlePassList li")).map((item) => {
    const parts = item.innerText.split(" | ");
    return {
      bonusId: 1,
      level: parseInt(parts[0].split(": ")[1], 10),
      wager: parseFloat(parts[1].split(": ")[1].replace(/\D/g, "")),
      wagerDifference: parseFloat(parts[2].split(": ")[1].replace(/\D/g, "")),
      cashPrizes: parts[3].split(": ")[1],
      rakebackBonus: parts[4].split(": ")[1],
      freeSpins: parseInt(parts[5].split(": ")[1], 10),
    };
  });

  // Collect Calendar Bonus data with default values
  const calendarBonus = {
    bonusId: 1,
    distributionDays: parseInt(document.getElementById("distributionDays").value, 10) || 0, // Default to 0 if invalid
    morningSplit: parseFloat(document.getElementById("morningSplit").value) || 0,         // Default to 0 if invalid
    afternoonSplit: parseFloat(document.getElementById("afternoonSplit").value) || 0,     // Default to 0 if invalid
    eveningSplit: parseFloat(document.getElementById("eveningSplit").value) || 0,         // Default to 0 if invalid
  };


  // Combine all data into one payload
  const payload = {
    baseRakeback,
    rakeBoost,
    dailyBonus,
    weeklyBonus,
    monthlyBonus,
    rankUpBonus,
    battlePass,
    calendarBonus,
  };

  try {
    const response = await ConnectionManager.request("/api/bonus/configuration/save",'POST', payload); 
    // {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(payload),
    // });
    console.log("Configurations saved successfully:", response);

    ConnectionManager.addAlert("Configuration saved successfully!", "success");
    hideUnsavedChangesMessage(); // Reset unsaved changes tracker    
  } catch (error) {
    console.error("Error saving configuration:", error);
    ConnectionManager.addAlert("An error occurred while saving configuration.");
  }
}


function resetConfig() {
  alert("Configurations reset to default!");
  loadConfig();
  hideUnsavedChangesMessage();
}

async function loadConfig() {
  try {
      const response = await ConnectionManager.request('/api/bonus/configuration');      
      const data = response;
      console.log("Bonus Configurations:", data);

      // Prefill the fields with the retrieved data
      document.getElementById("baseRakebackPercentage").value = data.baseRakeback[0]?.percentage || 0;
      document.getElementById("baseRakebackCooldown").value = data.baseRakeback[0]?.claim_cooldown_minutes || 0;

      document.getElementById("rakeBoostPercentage").value = data.rakeBoost[0]?.bonus_percentage || 0;
      document.getElementById("rakeBoostDuration").value = data.rakeBoost[0]?.duration_hours || 0;
      document.getElementById("rakeBoostActivities").value = data.rakeBoost[0]?.trigger_activity || "";

      document.getElementById("dailyBonusPercentage").value = data.dailyBonus[0]?.percentage || 0;
      document.getElementById("dailyBonusMaxDays").value = data.dailyBonus[0]?.max_accumulation_days || 0;
      document.getElementById("dailyBonusImmediateClaim").value = data.dailyBonus[0]?.immediate_claim_percentage || 0;
      document.getElementById("dailyBonusCalendarClaim").value = data.dailyBonus[0]?.calendar_claim_percentage || 0;

      document.getElementById("weeklyBonusPercentage").value = data.weeklyBonus[0]?.percentage || 0;
      document.getElementById("weeklyBonusImmediateClaim").value = data.weeklyBonus[0]?.immediate_claim_percentage || 0;
      document.getElementById("weeklyBonusCalendarClaim").value = data.weeklyBonus[0]?.calendar_claim_percentage || 0;

      document.getElementById("monthlyBonusPercentage").value = data.monthlyBonus[0]?.percentage || 0;
      document.getElementById("monthlyBonusImmediateClaim").value = data.monthlyBonus[0]?.immediate_claim_percentage || 0;
      document.getElementById("monthlyBonusCalendarClaim").value = data.monthlyBonus[0]?.calendar_claim_percentage || 0;

      // Populate Rank Up Bonus
      const rankUpList = document.getElementById("rankList");
      rankUpList.innerHTML = "";
      (data.rankUpBonus[0] || []).forEach((rank) => {
          const listItem = document.createElement("li");
          listItem.className = "list-group-item d-flex justify-content-between align-items-center";
          listItem.innerHTML = `
              Rank: ${rank.rank} | Total Wager: $${rank.total_wager} | Rakeback: ${rank.rakeback}%
              <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">X</button>
          `;
          rankUpList.appendChild(listItem);
      });

      // Populate Battle Pass
      const battlePassList = document.getElementById("battlePassList");
      battlePassList.innerHTML = "";
      (data.battlePass[0] || []).forEach((level) => {
          const listItem = document.createElement("li");
          listItem.className = "list-group-item d-flex justify-content-between align-items-center";
          listItem.innerHTML = `
              Level: ${level.level} | Wager: $${level.wager} | Wager Difference: $${level.wager_difference} | Cash Prizes: ${level.cash_prizes} | Rakeback Bonus: ${level.rakeback_bonus} | Free Spins: ${level.free_spins}
              <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">X</button>
          `;
          battlePassList.appendChild(listItem);
      });

      // Set Calendar Bonus
      document.getElementById("distributionDays").value = data.calendarBonus[0]?.distribution_days || 0;
      document.getElementById("morningSplit").value = data.calendarBonus[0]?.morning_split || 0;
      document.getElementById("afternoonSplit").value = data.calendarBonus[0]?.afternoon_split || 0;
      document.getElementById("eveningSplit").value = data.calendarBonus[0]?.evening_split || 0;
      document.getElementById("distributionDisplay").innerText = `Current Distribution Days: ${data.calendarBonus[0]?.distribution_days || 0}`;
      document.getElementById("timeSplitDisplay").innerText = `Current Splits: Morning: ${data.calendarBonus[0]?.morning_split || 0}%, Afternoon: ${data.calendarBonus[0]?.afternoon_split || 0}%, Evening: ${data.calendarBonus[0]?.evening_split || 0}%`;  

  } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load bonus configuration');
  }
}


// page end

//unsaved changes start

let hasUnsavedChanges = false;

// Function to display the unsaved changes message
function showUnsavedChangesMessage() {
  if (!hasUnsavedChanges) {
    const messageDiv = document.createElement("div");
    messageDiv.id = "unsavedChangesMessage";
    messageDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #ffc107;
      color: #000;
      text-align: center;
      padding: 10px 0;
      z-index: 1000;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
    `;
    messageDiv.innerText = "You have unsaved changes. Please save or discard your changes.";
    document.body.prepend(messageDiv);
    hasUnsavedChanges = true;
  }
}

// Function to remove the unsaved changes message
function hideUnsavedChangesMessage() {
  const messageDiv = document.getElementById("unsavedChangesMessage");
  if (messageDiv) {
    messageDiv.remove();
    hasUnsavedChanges = false;
  }
}

// Add event listeners to all input, select, and textarea fields
function monitorUnsavedChanges() {
  const fields = document.querySelectorAll("input, select, textarea");
  fields.forEach(field => {
    field.addEventListener("input", showUnsavedChangesMessage);
    field.addEventListener("change", showUnsavedChangesMessage);
  });

  // Optional: Add a confirmation before leaving the page
  window.addEventListener("beforeunload", (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Do you want to leave without saving?";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Call monitorUnsavedChanges to track unsaved changes
  monitorUnsavedChanges();

  // Call loadConfig to prefill the admin panel fields
  loadConfig();
});


//unsaved changes end