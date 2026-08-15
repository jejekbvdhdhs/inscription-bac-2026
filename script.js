// ===== المتغيرات الأساسية =====
let registeredStudents = [];
const MAX_STUDENTS_PER_FOUJ = 50;
let currentSelectedFouj = "";
let isFirebaseReady = false;
let pendingStudentData = null;

const FOUJ_NAMES = {
  "برج بوعريريج_السبت 08:30 صباحا والثلاثاء 01:30 مساء": "فوج الرياضيات والهندسة",
  "برج بوعريريج_السبت 10:30 صباحا والثلاثاء 03:30 مساء": "فوج العلوم التجريبية",
  "برج بوعريريج_السبت 01:15 مساء والجمعة 08:30 صباحا": "فوج الرياضيات رقم 02"
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
    name: "فوج العلوم التجريبية",
    location: "برج بوعريريج",
    schedule: "السبت 10:30 صباحا والثلاثاء 03:30 مساء"
  },
  {
    key: "برج بوعريريج_السبت 01:15 مساء والجمعة 08:30 صباحا",
    name: "فوج الرياضيات رقم 02",
    location: "برج بوعريريج",
    schedule: "السبت 01:15 مساء والجمعة 08:30 صباحا"
  }
];

// فوج الرياضيات الأول لا يُفتح فوج الرياضيات رقم 02 إلا بعد امتلائه بهذا العدد
const MAIN_MATH_FOUJ_KEY = "برج بوعريريج_السبت 08:30 صباحا والثلاثاء 01:30 مساء";
const MATH_FOUJ2_KEY = "برج بوعريريج_السبت 01:15 مساء والجمعة 08:30 صباحا";
const MATH_FOUJ2_THRESHOLD = 60;

// عدد التلاميذ المسجلين حالياً في فوج معين (بالمفتاح)
function countFoujStudents(key) {
  const opt = FOUJ_OPTIONS.find((f) => f.key === key);
  if (!opt) return 0;
  return registeredStudents.filter((s) => s.location === opt.location && s.schedule === opt.schedule).length;
}

// هل هذا الفوج متاح للتسجيل حالياً؟ (فوج الرياضيات رقم 02 مقفل حتى يمتلئ الفوج الأول)
function isFoujUnlocked(key) {
  if (key !== MATH_FOUJ2_KEY) return true;
  return countFoujStudents(MAIN_MATH_FOUJ_KEY) >= MATH_FOUJ2_THRESHOLD;
}

// ===== قائمة الثانويات (برج بوعريريج) - مصدر واحد يُستخدم في القائمة المنبثقة والتحقق =====
const SCHOOLS_LIST = [
  "مؤسسة التربية والتعليم القوس الأول الخاصة - برج بوعريريج",
  "ثانوية سيفي الطاهر - ثنية النصر",
  "ثانوية بلم عبد الحفيظ - أولاد ابراهيم",
  "ثانوية المجاهد يحى بو عزيز - الماين",
  "ثانوية الشهيد بوز عرورة السعيد - برج بوعريريج",
  "ثانوية عيسى حميطوش - برج بوعريريج",
  "ثانوية محمد الشريف بوسام - برج غدير",
  "ثانوية مالك بن نبي - برج غدير",
  "ثانوية بن خروف يوسف - الجعافرة",
  "ثانوية عمار بوجلال مبارك - مجانة",
  "ثانوية الشهيد زيوال علاوة - الجعافرة",
  "ثانوية فارح محمد الطيب - القصور",
  "ثانوية المجاهد المتوفي بن أحمد السعيد - برج بوعريريج",
  "ثانوية محمادي أحمد - العناصر",
  "ثانوية ابن احمد الخضر - العناصر",
  "ثانوية بن سخرية الطيب - المهير",
  "ثانوية بهاء العلى - خليل",
  "ثانوية فارس الحسين - برج بوعريريج",
  "ثانوية بوشمال محمد النذير - المنصورة",
  "ثانوية كيال عراس - تيكستار",
  "ثانوية الشيخ عمر ابي حفص - برج زمورة",
  "ثانوية عبد المجيد بورزق - برج بوعريريج",
  "ثانوية عبد اللافي بوضياف - عين تاغروت",
  "ثانوية 545 شهيدا - غيلاسة",
  "ثانوية على ماضوي - برج بوعريريج",
  "ثانوية الشهيد بن دريميع احمد المدعو المطروش - برج غدير",
  "ثانوية عبد الحميد بن باديس - المنصورة",
  "ثانوية بوزراعة أحسن - رأس الوادي",
  "ثانوية بلفار اسماعيل - أولاد دحمان",
  "ثانوية 16 شهيدا - بليمور",
  "ثانوية سقني عيسى - مجانة",
  "ثانوية زيري مباركة - بن داود",
  "ثانوية قصار عبد الله - القصور",
  "ثانوية الاخوة رباح - رأس الوادي",
  "ثانوية فرحات عباس - برج بوعريريج",
  "ثانوية الشريف الرقط - رأس الوادي",
  "ثانوية احمد خبابة - برج غدير",
  "ثانوية أول نوفمبر - برج بوعريريج",
  "مؤسسة التربية والتعليم التحدي الخاصة - برج بوعريريج",
  "ثانوية عبد الحميد آخروف - برج بوعريريج",
  "ثانوية شكال محمد امزيان - القلة",
  "ثانوية العمري بوعافية - حسناوة",
  "ثانوية السعيد بوعلي - برج بوعريريج",
  "ثانوية بلعيفة احمد - بن داود",
  "ثانوية بلميهوب عبد الرحمان - برج بوعريريج",
  "ثانوية العربي عباسي - سيدي مبارك",
  "ثانوية بوادي بوسواليم - رأس الوادي",
  "ثانوية حريزي البشير - العش",
  "ثانوية المجاهد المتوفي مجدوب محمد - برج بوعريريج",
  "ثانوية زرقون سليمان - خليل",
  "ثانوية عبد الحق بن حمودة - المهير",
  "ثانوية سالم صريفق - رأس الوادي",
  "ثانوية هواري بومدين - الياشير",
  "ثانوية محمد المقراني - برج بوعريريج",
  "ثانوية بن مساهل محمد - بئر قصد علي",
  "ثانوية صاهد مبارك - الحمادية",
  "ثانوية الأخوين الشهيدين يوسفي مولود ولعيفة - حرازة",
  "ثانوية بالعروسي بن يحي - الرابطة",
  "ثانوية معركة قرن الكبش - تقلعيت",
  "ثانوية رماش عمر - عين تسرة",
  "ثانوية السعيد زروقي - برج بوعريريج",
  "ثانوية 18 فيفري - الحمادية",
  "أخرى"
];
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
  const schoolSearch = document.getElementById("schoolSearch");
  const schoolHidden = document.getElementById("school");
  const schoolOtherWrap = document.getElementById("schoolOtherWrap");
  const schoolOther = document.getElementById("schoolOther");
  const isRegular = radio.value === "نظامي";
  schoolField.style.display = isRegular ? "block" : "none";
  if (!isRegular) {
    if (schoolSearch) schoolSearch.value = "";
    if (schoolHidden) schoolHidden.value = "";
    if (schoolOtherWrap) schoolOtherWrap.style.display = "none";
    if (schoolOther) schoolOther.value = "";
    const dropdown = document.getElementById("schoolDropdown");
    if (dropdown) dropdown.classList.remove("active");
  }
}

// ===== القائمة المنبثقة للثانويات (بحث + اختيار) =====
function setupSchoolAutocomplete() {
  const searchInput = document.getElementById("schoolSearch");
  const hiddenInput = document.getElementById("school");
  const dropdown = document.getElementById("schoolDropdown");
  const otherWrap = document.getElementById("schoolOtherWrap");
  const otherInput = document.getElementById("schoolOther");
  if (!searchInput || !hiddenInput || !dropdown) return;

  function positionDropdown() {
    const rect = searchInput.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const desiredHeight = Math.min(260, dropdown.scrollHeight || 260);

    dropdown.style.left = rect.left + "px";
    dropdown.style.width = rect.width + "px";

    if (spaceBelow < desiredHeight + 12 && spaceAbove > spaceBelow) {
      // ما فيه مساحة كافية تحت (غالباً بسبب لوحة المفاتيح) -> افتح فوق الحقل
      dropdown.style.top = "";
      dropdown.style.bottom = (viewportHeight - rect.top + 6) + "px";
      dropdown.style.maxHeight = Math.max(120, spaceAbove - 12) + "px";
      dropdown.classList.add("pop-above");
    } else {
      dropdown.style.bottom = "";
      dropdown.style.top = (rect.bottom + 6) + "px";
      dropdown.style.maxHeight = Math.max(120, spaceBelow - 12) + "px";
      dropdown.classList.remove("pop-above");
    }
  }

  function renderDropdown(filterText) {
    const filtered = filterText
      ? SCHOOLS_LIST.filter(s => s.includes(filterText.trim()))
      : SCHOOLS_LIST;

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="school-option no-match">لا توجد نتائج مطابقة</div>`;
    } else {
      dropdown.innerHTML = filtered.map(s => {
        const isSelected = s === hiddenInput.value ? " selected" : "";
        return `<div class="school-option${isSelected}" data-value="${s.replace(/"/g, "&quot;")}">${s}</div>`;
      }).join("");
    }
    dropdown.classList.add("active");
    positionDropdown();
  }

  function closeDropdown() {
    dropdown.classList.remove("active");
  }

  searchInput.addEventListener("focus", () => renderDropdown(searchInput.value));
  searchInput.addEventListener("input", () => {
    hiddenInput.value = ""; // إبطال أي اختيار سابق حتى يتم الاختيار من القائمة مجدداً
    renderDropdown(searchInput.value);
  });

  // إعادة حساب الموقع عند التمرير أو تغيير حجم النافذة (مثلاً عند ظهور/اختفاء لوحة المفاتيح فالهاتف)
  window.addEventListener("resize", () => { if (dropdown.classList.contains("active")) positionDropdown(); });
  window.addEventListener("scroll", () => { if (dropdown.classList.contains("active")) positionDropdown(); }, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => { if (dropdown.classList.contains("active")) positionDropdown(); });
  }

  dropdown.addEventListener("click", (e) => {
    const option = e.target.closest(".school-option");
    if (!option || option.classList.contains("no-match")) return;
    const value = option.getAttribute("data-value");
    hiddenInput.value = value;
    searchInput.value = value;
    closeDropdown();

    if (value === "أخرى") {
      otherWrap.style.display = "block";
      otherInput.focus();
    } else {
      otherWrap.style.display = "none";
      otherInput.value = "";
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".school-autocomplete") && !e.target.closest(".school-dropdown")) closeDropdown();
  });
}

function updateLocationOptions(radio) {
  if (!radio || !radio.checked) return;
  document.getElementById("scheduleOptions").style.display = "block";
  document.getElementById("mapContainer").style.display = "block";

  // إخفاء قسم الفيديو التوجيهي تلقائياً إذا لم يتم استبدال الرابط الوهمي برابط حقيقي
  const videoFrame = document.getElementById("videoFrame");
  const videoSection = document.getElementById("videoSection");
  if (videoFrame && videoSection) {
    const src = videoFrame.getAttribute("src") || "";
    if (!src || src === "YOUR_YOUTUBE_VIDEO_EMBED_LINK") {
      videoSection.style.display = "none";
    } else {
      videoSection.style.display = "block";
    }
  }

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
          <span class="radio-icon">🕗</span> فوج الرياضيات والهندسة: السبت 08:30 صباحا والثلاثاء 01:30 مساء
      </label>`;

    if (isFoujUnlocked(MATH_FOUJ2_KEY)) {
      scheduleHTML += `
      <label class="radio-label">
          <input required type="radio" name="schedule" value="السبت 01:15 مساء والجمعة 08:30 صباحا">
          <span class="radio-icon">🕐</span> فوج الرياضيات رقم 02: السبت 01:15م والجمعة 08:30ص
      </label>`;
    } else {
      const remaining = Math.max(0, MATH_FOUJ2_THRESHOLD - countFoujStudents(MAIN_MATH_FOUJ_KEY));
      scheduleHTML += `
      <div class="radio-label" style="opacity:0.55; cursor:not-allowed; pointer-events:none;">
          <span class="radio-icon">🔒</span> فوج الرياضيات رقم 02 (سيُفتح عند اكتمال ${MATH_FOUJ2_THRESHOLD} تلميذاً في الفوج الأول - متبقي ${remaining})
      </div>`;
    }
  } else if (selectedBranch.value === "علوم تجريبية") {
    scheduleHTML = `
      <label class="radio-label">
          <input required type="radio" name="schedule" value="السبت 10:30 صباحا والثلاثاء 03:30 مساء">
          <span class="radio-icon">🕥</span> فوج العلوم التجريبية: السبت 10:30ص والثلاثاء 03:30م
      </label>`;
  }
  scheduleChoices.innerHTML = scheduleHTML;
}

// ===== التسجيل والتفاعلات =====
document.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();
  setupSchoolAutocomplete();

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
      let finalSchoolVal = (formData.get("school") || "").trim();
      if (studentTypeVal === "نظامي") {
        if (!finalSchoolVal || !SCHOOLS_LIST.includes(finalSchoolVal)) {
          alert("⚠️ يرجى اختيار الثانوية من القائمة المقترحة (اكتب اسمها للبحث ثم اختَرها).");
          return;
        }
        if (finalSchoolVal === "أخرى") {
          const otherVal = (document.getElementById("schoolOther").value || "").trim();
          if (!otherVal) {
            alert("⚠️ يرجى كتابة اسم ثانويتك في الخانة المخصصة لذلك.");
            return;
          }
          finalSchoolVal = otherVal;
        }
      }
      
      pendingStudentData = {
        studentType: formData.get("studentType"),
        school: studentTypeVal === "نظامي" ? finalSchoolVal : "غير محدد",
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
  const targetKey = `${studentData.location}_${studentData.schedule}`;
  if (!isFoujUnlocked(targetKey)) {
    alert("⚠️ فوج الرياضيات رقم 02 غير متاح للتسجيل بعد، يرجى اختيار فوج آخر.");
    return;
  }

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
    
    if (password === "akram@site.com") {
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
    populateFoujFilterSelect();
    displayTotalCount();
    displayFoujStats();
    displayCharts();
    applyAllFilters();
  }
}

// تعبئة قائمة فلترة الأفواج بخيارات ديناميكية من FOUJ_OPTIONS
function populateFoujFilterSelect() {
  const select = document.getElementById("foujFilter");
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = `<option value="">جميع الأفواج</option>` +
    FOUJ_OPTIONS.map((opt) => `<option value="${opt.key}">${opt.name}</option>`).join("");
  select.value = currentValue || currentFoujFilterKey || "";
}

// ===== الرسوم البيانية (دوائر نسبية + مخطط صندوق) =====
const CHART_COLORS = ["#3498db","#e67e22","#27ae60","#9b59b6","#e74c3c","#1abc9c","#f1c40f","#34495e","#16a085","#c0392b","#7f8c8d","#2c3e50"];

function renderPieChart(containerId, dataMap, title) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = Object.entries(dataMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total === 0) {
    container.innerHTML = `<h4 style="text-align:center; margin-bottom:8px;">${title}</h4><p style="color:#999; text-align:center; padding:20px;">لا توجد بيانات كافية بعد</p>`;
    return;
  }

  const cx = 100, cy = 100, r = 90;
  let startAngle = -90;
  let paths = "";
  let legend = "";

  entries.forEach(([label, value], i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;

    if (entries.length === 1) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"></circle>`;
    } else {
      const endAngle = startAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;
      const x1 = cx + r * Math.cos((Math.PI / 180) * startAngle);
      const y1 = cy + r * Math.sin((Math.PI / 180) * startAngle);
      const x2 = cx + r * Math.cos((Math.PI / 180) * endAngle);
      const y2 = cy + r * Math.sin((Math.PI / 180) * endAngle);
      paths += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" stroke="#fff" stroke-width="1.5"></path>`;
      startAngle = endAngle;
    }

    legend += `
      <div style="display:flex; align-items:center; gap:8px; margin:5px 0; font-size:0.85rem;">
        <span style="width:12px; height:12px; border-radius:3px; background:${color}; flex-shrink:0; display:inline-block;"></span>
        <span>${label}: <strong>${value}</strong> (${percentage.toFixed(1)}%)</span>
      </div>`;
  });

  container.innerHTML = `
    <h4 style="text-align:center; margin-bottom:12px;">${title}</h4>
    <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:center;">
      <svg viewBox="0 0 200 200" width="160" height="160" style="flex-shrink:0;">${paths}</svg>
      <div style="min-width:140px;">${legend}</div>
    </div>
    <div style="text-align:center; font-size:0.75rem; color:#999; margin-top:8px;">الإجمالي: ${total}</div>
  `;
}

function displayCharts() {
  // كيف سمعت بنا
  const hearMap = {};
  registeredStudents.forEach((s) => {
    const k = s.howDidYouHear || "غير محدد";
    hearMap[k] = (hearMap[k] || 0) + 1;
  });
  renderPieChart("hearChartContainer", hearMap, "📢 كيف سمعت بنا");

  // قدرات التلاميذ (المستوى)
  const levelMap = {};
  registeredStudents.forEach((s) => {
    const k = s.mathLevel || "غير محدد";
    levelMap[k] = (levelMap[k] || 0) + 1;
  });
  renderPieChart("levelChartContainer", levelMap, "📊 قدرات التلاميذ (المستوى)");

  // الثانويات (الطلبة الأحرار "غير محدد" تُعرض باسم "حر")
  const schoolMap = {};
  registeredStudents.forEach((s) => {
    let k = (s.school || "غير محدد").trim();
    if (k === "غير محدد" || k === "") k = "حر";
    schoolMap[k] = (schoolMap[k] || 0) + 1;
  });
  renderPieChart("schoolChartContainer", schoolMap, "🏫 توزيع الثانويات");

  renderLevelBoxPlot("levelBoxPlotContainer");
}

// مخطط الصندوق (Box Plot) لمستوى التلاميذ، بترميز المستويات على مقياس رقمي 1-5
const LEVEL_SCALE = { "ضعيف": 1, "مقبول": 2, "جيد": 3, "جيد جداً": 4, "ممتاز": 5 };
const LEVEL_LABELS = ["ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

function computeBoxPlotStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  const quantile = (arr, q) => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
  };
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[n - 1]
  };
}

function renderLevelBoxPlot(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const values = registeredStudents.map((s) => LEVEL_SCALE[s.mathLevel]).filter((v) => v !== undefined);

  if (values.length === 0) {
    container.innerHTML = `<h4 style="text-align:center; margin-bottom:8px;">📦 مخطط الصندوق لمستوى التلاميذ</h4><p style="color:#999; text-align:center; padding:20px;">لا توجد بيانات كافية بعد</p>`;
    return;
  }

  const stats = computeBoxPlotStats(values);
  const scaleMin = 1, scaleMax = 5;
  const toX = (v) => 40 + ((v - scaleMin) / (scaleMax - scaleMin)) * 320;
  const y = 55, boxHeight = 44;

  const svg = `
    <svg viewBox="0 0 400 130" width="100%" style="max-width:440px; display:block; margin:0 auto;">
      <line x1="40" y1="${y}" x2="360" y2="${y}" stroke="#ddd" stroke-width="1"></line>
      <line x1="${toX(stats.min).toFixed(1)}" y1="${y}" x2="${toX(stats.max).toFixed(1)}" y2="${y}" stroke="#2c3e50" stroke-width="2"></line>
      <line x1="${toX(stats.min).toFixed(1)}" y1="${y - 12}" x2="${toX(stats.min).toFixed(1)}" y2="${y + 12}" stroke="#2c3e50" stroke-width="2"></line>
      <line x1="${toX(stats.max).toFixed(1)}" y1="${y - 12}" x2="${toX(stats.max).toFixed(1)}" y2="${y + 12}" stroke="#2c3e50" stroke-width="2"></line>
      <rect x="${toX(stats.q1).toFixed(1)}" y="${y - boxHeight / 2}" width="${Math.max(2, toX(stats.q3) - toX(stats.q1)).toFixed(1)}" height="${boxHeight}" fill="#3498db" fill-opacity="0.25" stroke="#3498db" stroke-width="2" rx="4"></rect>
      <line x1="${toX(stats.median).toFixed(1)}" y1="${y - boxHeight / 2}" x2="${toX(stats.median).toFixed(1)}" y2="${y + boxHeight / 2}" stroke="#e74c3c" stroke-width="3"></line>
      ${LEVEL_LABELS.map((lab, i) => `<text x="${toX(i + 1).toFixed(1)}" y="${y + 38}" font-size="11" text-anchor="middle" fill="#666">${lab}</text>`).join("")}
    </svg>
    <div style="text-align:center; font-size:0.82rem; color:#555; margin-top:6px;">
      الوسيط: <strong>${LEVEL_LABELS[Math.round(stats.median) - 1] || stats.median.toFixed(1)}</strong>
      &nbsp;|&nbsp; الربيع الأول: ${LEVEL_LABELS[Math.round(stats.q1) - 1] || stats.q1.toFixed(1)}
      &nbsp;|&nbsp; الربيع الثالث: ${LEVEL_LABELS[Math.round(stats.q3) - 1] || stats.q3.toFixed(1)}
    </div>
  `;

  container.innerHTML = `<h4 style="text-align:center; margin-bottom:12px;">📦 مخطط الصندوق لمستوى التلاميذ (Box Plot)</h4>${svg}`;
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

let currentFoujFilterKey = "";

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
  Object.entries(foujStats).forEach(([key, fouj]) => {
    const percentage = (fouj.count / fouj.capacity) * 100;
    const isFull = fouj.count >= fouj.capacity;
    const isEmpty = fouj.count === 0;
    const isActive = key === currentFoujFilterKey;
    let cardClass = "stat-card";
    if (isEmpty) cardClass += " empty";
    if (isActive) cardClass += " active-fouj";

    container.innerHTML += `
        <div class="${cardClass}" data-fouj-key="${key}" style="cursor:pointer; ${isActive ? 'outline: 3px solid #2c3e50; outline-offset: 2px;' : ''}">
            <h4>${fouj.name}</h4>
            <div class="stat-number">${fouj.count}/${fouj.capacity}</div>
            <div class="capacity-bar">
                <div class="capacity-fill ${isFull ? "capacity-full" : ""}" style="width: ${percentage}%"></div>
            </div>
            ${isActive ? '<div style="font-size:0.75rem; color:#2c3e50; margin-top:6px; font-weight:700;">✓ مُفعّل - اضغط للإلغاء</div>' : ''}
        </div>
    `;
  });

  container.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.getAttribute("data-fouj-key");
      filterByFouj(key === currentFoujFilterKey ? "" : key);
    });
  });
}

// فلترة جدول التلاميذ حسب الفوج المختار (من الكادر أو من القائمة المنسدلة)
function filterByFouj(key) {
  currentFoujFilterKey = key || "";
  const select = document.getElementById("foujFilter");
  if (select) select.value = currentFoujFilterKey;
  displayFoujStats();
  applyAllFilters();
}

function displayStudentsTable(filteredStudents = null) {
  const tableBody = document.getElementById("studentsTableBody");
  if (!tableBody) return;

  const studentsToShow = filteredStudents || registeredStudents;

  if (studentsToShow.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>لا توجد تسجيلات حتى الآن</td></tr>`;
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
                <td>${student.school || "غير محدد"}</td>
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

function applyAllFilters() {
  const branchFilter = document.getElementById("branchFilter");
  const nameFilter = document.getElementById("nameSearchFilter");
  let filtered = registeredStudents;

  if (currentFoujFilterKey) {
    const opt = FOUJ_OPTIONS.find((f) => f.key === currentFoujFilterKey);
    if (opt) filtered = filtered.filter((s) => s.location === opt.location && s.schedule === opt.schedule);
  }

  if (branchFilter && branchFilter.value) {
    filtered = filtered.filter((s) => s.branch === branchFilter.value);
  }

  if (nameFilter && nameFilter.value.trim()) {
    const q = nameFilter.value.trim().toLowerCase();
    filtered = filtered.filter((s) => {
      const first = (s.firstName || "").toLowerCase();
      const last = (s.lastName || "").toLowerCase();
      return first.includes(q) || last.includes(q) || `${first} ${last}`.includes(q);
    });
  }

  const titleEl = document.getElementById("currentFoujTitle");
  if (titleEl) {
    const opt = currentFoujFilterKey ? FOUJ_OPTIONS.find((f) => f.key === currentFoujFilterKey) : null;
    titleEl.textContent = opt ? `تلاميذ: ${opt.name} (${filtered.length})` : `جميع الطلاب المسجلين (${filtered.length})`;
  }

  displayStudentsTable(filtered);
}

// ===== النوافذ الإضافية (تغيير الفوج والحذف) =====
function showFoujChangeModal() {
  document.getElementById("foujConfirmModal").style.display = "none";
  const foujChoices = document.getElementById("foujChoicesList");
  if(foujChoices) {
      foujChoices.innerHTML = "";
      FOUJ_OPTIONS.filter((opt) => isFoujUnlocked(opt.key)).forEach((opt) => {
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
  exportStudentsToCSV(registeredStudents, "تسجيلات_2027.csv");
}

function exportCurrentFoujToExcel() {
  // يصدّر بالضبط ما هو معروض حالياً فالجدول (بعد تطبيق فلتر الفوج/الشعبة/البحث بالاسم)
  let filtered = registeredStudents;
  if (currentFoujFilterKey) {
    const opt = FOUJ_OPTIONS.find((f) => f.key === currentFoujFilterKey);
    if (opt) filtered = filtered.filter((s) => s.location === opt.location && s.schedule === opt.schedule);
  }
  const branchFilter = document.getElementById("branchFilter");
  if (branchFilter && branchFilter.value) {
    filtered = filtered.filter((s) => s.branch === branchFilter.value);
  }
  const nameFilter = document.getElementById("nameSearchFilter");
  if (nameFilter && nameFilter.value.trim()) {
    const q = nameFilter.value.trim().toLowerCase();
    filtered = filtered.filter((s) => {
      const first = (s.firstName || "").toLowerCase();
      const last = (s.lastName || "").toLowerCase();
      return first.includes(q) || last.includes(q) || `${first} ${last}`.includes(q);
    });
  }

  if (filtered.length === 0) {
    alert("لا توجد بيانات لتصديرها حسب الفلترة الحالية.");
    return;
  }

  const opt = currentFoujFilterKey ? FOUJ_OPTIONS.find((f) => f.key === currentFoujFilterKey) : null;
  const filename = opt ? `فوج_${opt.name.replace(/\s+/g, "_")}_2027.csv` : "الفوج_الحالي_2027.csv";
  exportStudentsToCSV(filtered, filename);
}

function exportStudentsToCSV(students, filename) {
  const headers = ["الرقم","الفوج","الاسم","اللقب","النوع","الثانوية","الشعبة","المستوى","الهاتف","كيف سمعت","التوقيت","تاريخ التسجيل"];
  let csvContent = "\uFEFF" + headers.join(",") + "\n";

  students.forEach((student, index) => {
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
  link.download = filename;
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