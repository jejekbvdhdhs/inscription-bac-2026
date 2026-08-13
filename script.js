// ===== المتغيرات الأساسية =====
let registeredStudents = [];
const MAX_STUDENTS_PER_FOUJ = 50;
let currentSelectedFouj = "";
let isFirebaseReady = false;
let pendingStudentData = null;

const FOUJ_NAMES = {
  "برج بوعريريج_السبت 08:30 صباحا والثلاثاء 01:30 مساء": "فوج الرياضيات والهندسة",
  "برج بوعريريج_السبت 10:30 صباحا والثلاثاء 03:30 مساء": "فوج العلوم التجريبية 1",
  "برج بوعريريج_السبت 01:15 مساء والجمعة 08:30 صباحا": "فوج العلوم التجريبية 2"
};

const FOUJ_OPTIONS = [
  {
    key: "برج بوعريريج_السبت 08:30 صباحا والثلاثاء 01:30 مساء",
    name: "فوج الرياضيات والهندسة",
    location: "برج بوعريريج",
    schedule: "السبت 08:30 صباحا والثلاثاء 01:30 مساء"
  },
  {
    key: "برج بوعريريج_السبت 10:30 صباحا والثلاثاء 03:30 مساء",
    name: "فوج العلوم التجريبية 1",
    location: "برج بوعريريج",
    schedule: "السبت 10:30 صباحا والثلاثاء 03:30 مساء"
  },
  {
    key: "برج بوعريريج_السبت 01:15 مساء والجمعة 08:30 صباحا",
    name: "فوج العلوم التجريبية 2",
    location: "برج بوعريريج",
    schedule: "السبت 01:15 مساء والجمعة 08:30 صباحا"
  }
];

// ===== دوال مساعدة =====
function generateStudentUID(student) {
  return student.firebaseId ? "fb_" + student.firebaseId : "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function getFoujName(location, schedule) {
  return FOUJ_NAMES[`${location}_${schedule}`] || `فوج ${location}`;
}

// التحقق من أن الاسم/اللقب مكتوب بالأحرف اللاتينية (الفرنسية) فقط
function isLatinName(value) {
  const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
  return namePattern.test((value || "").trim());
}

// ===== Firebase =====
function initializeFirebase() {
  if (window.firebaseInitialized && window.db) {
    isFirebaseReady = true;
    loadStudentsFromFirebase();
  } else {
    isFirebaseReady = false;
    registeredStudents = JSON.parse(localStorage.getItem("registeredStudents")) || [];
  }
  setTimeout(() => updateLocationOptions(document.querySelector('input[name="location"]:checked')), 500);
}

async function saveStudentToFirebase(studentData) {
  if (!isFirebaseReady) {
    studentData.uid = generateStudentUID(studentData);
    studentData.registrationDate = new Date().toLocaleDateString("ar-DZ");
    registeredStudents.unshift(studentData);
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents));
    return true;
  }
  try {
    const docRef = await window.db.collection("students").add({
      ...studentData,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    studentData.firebaseId = docRef.id;
    studentData.uid = generateStudentUID(studentData);
    studentData.registrationDate = new Date().toLocaleDateString("ar-DZ");
    registeredStudents.unshift(studentData);
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents));
    return true;
  } catch (error) {
    console.error("خطأ في حفظ البيانات:", error);
    return false;
  }
}

async function loadStudentsFromFirebase() {
  if (!isFirebaseReady) return;
  try {
    const snapshot = await window.db.collection("students").orderBy("timestamp", "desc").get();
    const students = [];
    snapshot.forEach((doc) => {
      students.push({ firebaseId: doc.id, ...doc.data(), uid: generateStudentUID({firebaseId: doc.id}) });
    });
    registeredStudents = students;
    localStorage.setItem("registeredStudents", JSON.stringify(students));
  } catch (error) {
    console.error(error);
  }
}

// ===== التنقل والنوافذ =====
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
    page.style.display = "none";
  });
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
    targetPage.style.display = "block";
    if (pageId === "adminPanel" && typeof updateAdminDisplay === "function") {
      updateAdminDisplay();
    }
  }
}

function showConsent() { document.getElementById("consentModal").style.display = "flex"; }
function closeConsent() { document.getElementById("consentModal").style.display = "none"; }
function goToRegistration() { closeConsent(); showPage("registrationPage"); }
function goToHome() { showPage("homePage"); }

function toggleSchoolField(radio) {
  const schoolField = document.getElementById("schoolField");
  const schoolInput = document.getElementById("school");
  const isRegular = radio.value === "نظامي";
  schoolField.style.display = isRegular ? "block" : "none";
  if (schoolInput) {
    if (isRegular) {
      schoolInput.setAttribute("required", "required");
    } else {
      schoolInput.removeAttribute("required");
      schoolInput.value = "";
    }
  }
}

function updateLocationOptions(radio) {
  if (!radio || !radio.checked) return;
  document.getElementById("scheduleOptions").style.display = "block";
  document.getElementById("mapContainer").style.display = "block";
  updateScheduleOptions();
}

function updateScheduleOptions() {
  const selectedBranch = document.querySelector('input[name="branch"]:checked');
  const scheduleChoices = document.getElementById("scheduleChoices");
  
  if (!selectedBranch) { scheduleChoices.innerHTML = ""; return; }

  let scheduleHTML = "";
  if (selectedBranch.value === "رياضيات" || selectedBranch.value === "الهندسة") {
    scheduleHTML = `
      <label class="radio-label">
          <input required type="radio" name="schedule" value="السبت 08:30 صباحا والثلاثاء 01:30 مساء">
          <span class="radio-icon">🕗</span> السبت 08:30 صباحا والثلاثاء 01:30 مساء (ماتيلام + هندسة)
      </label>`;
  } else if (selectedBranch.value === "علوم تجريبية") {
    scheduleHTML = `
      <label class="radio-label">
          <input required type="radio" name="schedule" value="السبت 10:30 صباحا والثلاثاء 03:30 مساء">
          <span class="radio-icon">🕥</span> الفوج الأول: السبت 10:30ص والثلاثاء 03:30م
      </label>
      <label class="radio-label">
          <input required type="radio" name="schedule" value="السبت 01:15 مساء والجمعة 08:30 صباحا">
          <span class="radio-icon">🕐</span> الفوج الثاني: السبت 01:15م والجمعة 08:30ص
      </label>`;
  }
  scheduleChoices.innerHTML = scheduleHTML;
}

// ===== التسجيل والتفاعلات =====
document.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();

  // إرسال نموذج التسجيل
  const form = document.getElementById("registrationForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = new FormData(this);

      // التحقق من أن الاسم واللقب مكتوبان بالأحرف اللاتينية (الفرنسية)
      const firstNameVal = (formData.get("firstName") || "").trim();
      const lastNameVal = (formData.get("lastName") || "").trim();
      if (!isLatinName(firstNameVal) || !isLatinName(lastNameVal)) {
        alert("⚠️ يرجى كتابة الاسم واللقب بالأحرف اللاتينية (الفرنسية) فقط، وليس بالعربية.");
        return;
      }

      // التحقق من اختيار ثانوية صحيحة من القائمة (إلزامي للطلبة النظاميين فقط)
      const studentTypeVal = formData.get("studentType");
      if (studentTypeVal === "نظامي") {
        const schoolVal = (formData.get("school") || "").trim();
        const schoolOptions = Array.from(document.querySelectorAll('#schoolsList option')).map(o => o.value);
        if (!schoolVal || !schoolOptions.includes(schoolVal)) {
          alert("⚠️ يرجى اختيار الثانوية من القائمة المقترحة (اكتب اسمها للبحث ثم اختَرها).");
          return;
        }
      }
      
      pendingStudentData = {
        studentType: formData.get("studentType"),
        school: formData.get("school") || "غير محدد",
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        fullName: formData.get("firstName") + " " + formData.get("lastName"),
        birthDate: formData.get("birthDate"),
        branch: formData.get("branch"),
        mathLevel: formData.get("mathLevel"),
        personalPhone: formData.get("personalPhone"),
        howDidYouHear: formData.get("howDidYouHear"),
        location: "برج بوعريريج",
        schedule: formData.get("schedule"),
      };

      const foujConfirmModal = document.getElementById("foujConfirmModal");
      const selectedFoujName = document.getElementById("selectedFoujName");
      if(foujConfirmModal && selectedFoujName) {
          selectedFoujName.textContent = getFoujName(pendingStudentData.location, pendingStudentData.schedule);
          foujConfirmModal.style.display = "flex";
      }
    });
  }
  
  // تغيير الفوج من طرف التلميذ
  const changeFoujForm = document.getElementById("changeFoujForm");
  if (changeFoujForm) {
      changeFoujForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const chosenFoujKey = document.querySelector('input[name="chosenFouj"]:checked');
          if (!chosenFoujKey) {
              alert("الرجاء اختيار فوج جديد.");
              return;
          }
          const fouj = FOUJ_OPTIONS.find((f) => f.key === chosenFoujKey.value);
          if (fouj) {
              pendingStudentData.location = fouj.location;
              pendingStudentData.schedule = fouj.schedule;
              document.getElementById("foujChangeModal").style.display = "none";
              finishStudentRegistration(pendingStudentData);
          }
      });
  }

  // تغيير الفوج من طرف الإدارة
  const adminChangeForm = document.getElementById("adminChangeFoujForm");
  if(adminChangeForm) {
      adminChangeForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          if(!studentToChangeFouj) return;
          
          const chosenFoujKey = document.querySelector('input[name="adminChosenFouj"]:checked');
          if (!chosenFoujKey) {
              alert("الرجاء اختيار فوج جديد.");
              return;
          }
          
          const newFouj = FOUJ_OPTIONS.find((f) => f.key === chosenFoujKey.value);
          if (newFouj) {
              const studentIndex = registeredStudents.findIndex(s => s.uid === studentToChangeFouj);
              if(studentIndex !== -1) {
                  registeredStudents[studentIndex].location = newFouj.location;
                  registeredStudents[studentIndex].schedule = newFouj.schedule;
                  
                  localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents));
                  
                  if(isFirebaseReady && registeredStudents[studentIndex].firebaseId) {
                      try {
                          await window.db.collection("students").doc(registeredStudents[studentIndex].firebaseId).update({
                              location: newFouj.location,
                              schedule: newFouj.schedule
                          });
                      } catch (err) {
                          console.error("خطأ في تحديث قاعدة البيانات", err);
                      }
                  }
                  closeAdminChangeFoujModal();
                  updateAdminDisplay();
              }
          }
      });
  }
});

function confirmFouj() {
  document.getElementById("foujConfirmModal").style.display = "none";
  finishStudentRegistration(pendingStudentData);
}

async function finishStudentRegistration(studentData) {
  document.getElementById("loadingIndicator").style.display = "block";
  const success = await saveStudentToFirebase(studentData);
  document.getElementById("loadingIndicator").style.display = "none";

  if (success) {
    const username = `${studentData.firstName.trim()}.${studentData.lastName.trim()}`;
    const qrData = encodeURIComponent(username);
    
    const qrImg = document.getElementById("qrCodeImg");
    qrImg.crossOrigin = "anonymous";
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
    
    document.getElementById("cardFirstName").textContent = studentData.firstName;
    document.getElementById("cardLastName").textContent = studentData.lastName;
    document.getElementById("cardBranch").textContent = studentData.branch;
    document.getElementById("cardFouj").textContent = getFoujName(studentData.location, studentData.schedule);
    
    showPage("confirmationPage");
    document.getElementById("registrationForm").reset();
  } else {
    alert("حدث خطأ أثناء التسجيل.");
  }
}

window.downloadCard = function() {
    const card = document.getElementById("studentCard");
    const qrImg = document.getElementById("qrCodeImg");

    if (!window.html2canvas) {
        alert("يرجى الانتظار، جاري تحميل المكتبة أو أنها غير متوفرة.");
        return;
    }

    function captureCard() {
        html2canvas(card, { useCORS: true, allowTaint: false, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `بطاقة_الطالب_${pendingStudentData.firstName}_${pendingStudentData.lastName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error("خطأ أثناء إنشاء صورة البطاقة:", err);
            alert("حدث خطأ أثناء تحميل البطاقة، حاول مرة أخرى.");
        });
    }

    // التأكد أن صورة الـ QR اكتملت تحميلها قبل التصوير، وإلا ستظهر البطاقة بدونها
    if (qrImg && !qrImg.complete) {
        qrImg.onload = captureCard;
        qrImg.onerror = () => {
            console.error("تعذر تحميل صورة QR");
            captureCard();
        };
    } else {
        captureCard();
    }
}

// ===== دوال لوحة التحكم الإدارية =====
function showPasswordModal() {
    const modal = document.getElementById("passwordModal");
    if (modal) modal.style.display = "flex";
}

function cancelPassword() {
    const modal = document.getElementById("passwordModal");
    if (modal) modal.style.display = "none";
}

function confirmPassword() {
    const passwordInput = document.getElementById("adminPassword");
    const password = passwordInput ? passwordInput.value : "";
    
    if (password === "admin123") {
        cancelPassword();
        showPage("adminPanel");
    } else if (password.trim() === "") {
        alert("يرجى إدخال كلمة المرور");
    } else {
        alert("كلمة مرور خاطئة");
        if (passwordInput) passwordInput.value = "";
    }
}

function updateAdminDisplay() {
  if (document.getElementById("adminPanel") && document.getElementById("adminPanel").classList.contains("active")) {
    displayTotalCount();
    displayFoujStats();
    displayStudentsTable();
  }
}

function displayTotalCount() {
  const container = document.getElementById("totalCountContainer");
  if (!container) return;

  const totalStudents = registeredStudents.length;
  const scienceCount = registeredStudents.filter((s) => s.branch === "علوم تجريبية").length;
  const mathCount = registeredStudents.filter((s) => s.branch === "رياضيات").length;
  const engCount = registeredStudents.filter((s) => s.branch === "الهندسة").length;

  container.innerHTML = `
    <div class="total-count-box">
      <div class="total-count-content">
        <div class="total-count-number">
          <i class="fas fa-users"></i>
          <span>${totalStudents}</span>
        </div>
        <div class="total-count-label">إجمالي الطلاب المسجلين</div>
        <div class="total-count-details">
          <div class="count-detail"><div class="count-detail-number">${scienceCount}</div><div class="count-detail-label">علوم تجريبية</div></div>
          <div class="count-detail"><div class="count-detail-number">${mathCount}</div><div class="count-detail-label">رياضيات</div></div>
          <div class="count-detail"><div class="count-detail-number">${engCount}</div><div class="count-detail-label">الهندسة</div></div>
        </div>
      </div>
    </div>
  `;
}

function displayFoujStats() {
  const container = document.getElementById("foujStatsContainer");
  if (!container) return;

  const foujStats = {};
  Object.keys(FOUJ_NAMES).forEach((key) => {
    const foujName = FOUJ_NAMES[key];
    const [location, schedule] = key.split('_');
    const students = registeredStudents.filter((s) => s.location === location && s.schedule === schedule);
    foujStats[key] = { name: foujName, count: students.length, capacity: MAX_STUDENTS_PER_FOUJ, students: students };
  });

  container.innerHTML = "";
  Object.values(foujStats).forEach((fouj) => {
    const percentage = (fouj.count / fouj.capacity) * 100;
    const isFull = fouj.count >= fouj.capacity;
    const isEmpty = fouj.count === 0;
    let cardClass = "stat-card";
    if (isEmpty) cardClass += " empty";

    container.innerHTML += `
        <div class="${cardClass}">
            <h4>${fouj.name}</h4>
            <div class="stat-number">${fouj.count}/${fouj.capacity}</div>
            <div class="capacity-bar">
                <div class="capacity-fill ${isFull ? "capacity-full" : ""}" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
  });
}

function displayStudentsTable(filteredStudents = null) {
  const tableBody = document.getElementById("studentsTableBody");
  if (!tableBody) return;

  const studentsToShow = filteredStudents || registeredStudents;

  if (studentsToShow.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>لا توجد تسجيلات حتى الآن</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  studentsToShow.forEach((student, index) => {
    const foujName = getFoujName(student.location, student.schedule);
    const registrationDate = student.registrationDate || new Date().toLocaleDateString("ar-DZ");
    const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="fouj-badge">${foujName}</span></td>
                <td><strong>${student.firstName || ""}</strong></td>
                <td><strong>${student.lastName || ""}</strong></td>
                <td>${student.studentType || ""}</td>
                <td>${student.branch || ""}</td>
                <td>${student.mathLevel || ""}</td>
                <td>${student.personalPhone || ""}</td>
                <td>${student.howDidYouHear || "غير محدد"}</td>
                <td title="${student.schedule}">${(student.schedule || "").substring(0, 20)}...</td>
                <td>${registrationDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openAdminChangeFoujModal('${student.uid}', '${student.firstName} ${student.lastName}')" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
                            <i class="fas fa-exchange-alt"></i> نقل
                        </button>
                        <button class="btn-delete" onclick="confirmDeleteStudent('${student.uid}', '${student.firstName} ${student.lastName}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    tableBody.innerHTML += row;
  });
}

function filterStudents() {
  const branchFilter = document.getElementById("branchFilter");
  let filtered = registeredStudents;
  if (branchFilter && branchFilter.value) {
    filtered = filtered.filter((s) => s.branch === branchFilter.value);
  }
  displayStudentsTable(filtered);
}

// ===== النوافذ الإضافية (تغيير الفوج والحذف) =====
function showFoujChangeModal() {
  document.getElementById("foujConfirmModal").style.display = "none";
  const foujChoices = document.getElementById("foujChoicesList");
  if(foujChoices) {
      foujChoices.innerHTML = "";
      FOUJ_OPTIONS.forEach((opt) => {
        foujChoices.innerHTML += `<label class="radio-label"><input required type="radio" name="chosenFouj" value="${opt.key}">${opt.name}</label>`;
      });
  }
  document.getElementById("foujChangeModal").style.display = "flex";
}

let studentToChangeFouj = null;
function openAdminChangeFoujModal(studentUID, studentName) {
    studentToChangeFouj = studentUID;
    const nameEl = document.getElementById('adminChangeFoujStudentName');
    if(nameEl) nameEl.textContent = studentName;
    
    const choicesList = document.getElementById('adminFoujChoicesList');
    if(choicesList) {
        choicesList.innerHTML = '';
        FOUJ_OPTIONS.forEach(opt => {
            choicesList.innerHTML += `<label class="radio-label"><input required type="radio" name="adminChosenFouj" value="${opt.key}">${opt.name}</label>`;
        });
    }
    
    const modal = document.getElementById('adminChangeFoujModal');
    if(modal) modal.style.display = 'flex';
}

function closeAdminChangeFoujModal() {
    studentToChangeFouj = null;
    const modal = document.getElementById('adminChangeFoujModal');
    if(modal) modal.style.display = 'none';
}

let studentToDelete = null;
function confirmDeleteStudent(studentUID, studentName) {
  studentToDelete = studentUID;
  const deleteNameElement = document.getElementById("deleteStudentName");
  if (deleteNameElement) deleteNameElement.textContent = studentName;
  const deleteModal = document.getElementById("deleteConfirmModal");
  if (deleteModal) deleteModal.style.display = "flex";
}

function cancelDelete() {
  studentToDelete = null;
  const deleteModal = document.getElementById("deleteConfirmModal");
  if (deleteModal) deleteModal.style.display = "none";
}

async function proceedWithDelete() {
  if (!studentToDelete) return;
  const studentUID = studentToDelete;
  cancelDelete();
  
  const studentIndex = registeredStudents.findIndex(s => s.uid === studentUID);
  if (studentIndex === -1) {
      alert("خطأ: لم يتم العثور على الطالب");
      return;
  }
  const student = registeredStudents[studentIndex];
  
  if (isFirebaseReady && student.firebaseId) {
      try { await window.db.collection("students").doc(student.firebaseId).delete(); } 
      catch (e) { console.error("خطأ في حذف الطالب", e); }
  }
  
  registeredStudents.splice(studentIndex, 1);
  localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents));
  updateAdminDisplay();
}

// ===== التصدير =====
function exportAllToExcel() {
  const headers = ["الرقم","الفوج","الاسم","اللقب","النوع","الثانوية","الشعبة","المستوى","الهاتف","كيف سمعت","التوقيت","تاريخ التسجيل"];
  let csvContent = "\uFEFF" + headers.join(",") + "\n";
  
  registeredStudents.forEach((student, index) => {
    const row = [
      index + 1,
      getFoujName(student.location, student.schedule),
      student.firstName || "",
      student.lastName || "",
      student.studentType || "",
      student.school || "غير محدد",
      student.branch || "",
      student.mathLevel || "",
      student.personalPhone || "",
      student.howDidYouHear || "غير محدد",
      student.schedule || "",
      student.registrationDate || ""
    ];
    csvContent += row.map(field => `"${field}"`).join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `تسجيلات_2027.csv`;
  link.click();
}

function exportToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registeredStudents));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_2027.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function refreshData() {
    if(isFirebaseReady) {
        await loadStudentsFromFirebase();
        updateAdminDisplay();
        alert("تم تحديث البيانات بنجاح");
    } else {
        alert("لا يوجد اتصال بقاعدة البيانات");
    }
}