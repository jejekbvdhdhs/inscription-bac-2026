// بيانات الطلاب المسجلين مع Firebase
let registeredStudents = []
const MAX_STUDENTS_PER_FOUJ = 50
let currentSelectedFouj = ""
let isFirebaseReady = false
let pendingStudentData = null
let currentEditingStudentUID = null // للتعديل
let studentToDelete = null // لحفظ معرف الطالب المراد حذفه

// تعريف أسماء الأفواج
const FOUJ_NAMES = {
  "رأس الوادي_يوم الجمعة صباحا الساعة 9:00": "فوج رأس الوادي 9:00",
  "برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)": "فوج البرج رياضيات+تقني 8:00",
  "برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)": "فوج البرج علمي 10:30",
  "برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)": "فوج البرج علمي 13:00",
}

// خيارات الأفواج للتغيير
const FOUJ_OPTIONS = [
  {
    key: "رأس الوادي_يوم الجمعة صباحا الساعة 9:00",
    name: "فوج رأس الوادي 9:00",
    location: "رأس الوادي",
    schedule: "يوم الجمعة صباحا الساعة 9:00",
  },
  {
    key: "برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)",
    name: "فوج البرج رياضيات+تقني 8:00",
    location: "برج بوعريريج",
    schedule: "يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)",
  },
  {
    key: "برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)",
    name: "فوج البرج علمي 10:30",
    location: "برج بوعريريج",
    schedule: "يوم السبت 10:30 صباحا (علوم تجريبية)",
  },
  {
    key: "برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)",
    name: "فوج البرج علمي 13:00",
    location: "برج بوعريريج",
    schedule: "يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)",
  },
]

// دالة مولد ID فريد
function generateStudentUID(student) {
  if (student.firebaseId) {
    return "fb_" + student.firebaseId
  } else {
    return "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }
}

// دالة البحث عن الطالب المُحسنة
function findStudentByUID(uid) {
  console.log("🔍 البحث عن الطالب بـ UID:", uid)

  const student = registeredStudents.find((s) => {
    const studentUID = s.uid || generateStudentUID(s)
    const match =
      studentUID === uid ||
      s.firebaseId === uid ||
      s.id === uid ||
      "fb_" + (s.firebaseId || "") === uid ||
      "local_" + (s.id || "") === uid

    if (match) {
      console.log("✅ تم العثور على الطالب:", s.fullName)
    }
    return match
  })

  if (!student) {
    console.error("❌ الطالب غير موجود:", uid)
    console.log(
      "📋 الطلاب المتاحون:",
      registeredStudents.map((s) => ({
        name: s.fullName,
        uid: s.uid,
        id: s.id,
        firebaseId: s.firebaseId,
      })),
    )
  }

  return student
}

// ===== دوال Firebase =====

// تحديث حالة الاتصال
function updateConnectionStatus(status) {
  const statusElement = document.getElementById("connectionStatus")
  const statusText = document.getElementById("statusText")

  if (statusElement && statusText) {
    statusElement.style.display = "flex"
    statusElement.className = "connection-status " + status

    switch (status) {
      case "connected":
        statusElement.style.background = "#27ae60"
        statusText.textContent = "متصل"
        break
      case "offline":
        statusElement.style.background = "#e74c3c"
        statusText.textContent = "غير متصل"
        break
      case "connecting":
        statusElement.style.background = "#f39c12"
        statusText.textContent = "يتصل..."
        break
    }

    if (status === "connected") {
      setTimeout(() => {
        statusElement.style.display = "none"
      }, 5000)
    }
  }
}

// تهيئة Firebase والتحقق من الاتصال
function initializeFirebase() {
  if (typeof firebase !== "undefined" && window.db) {
    isFirebaseReady = true
    updateConnectionStatus("connected")
    console.log("✅ Firebase جاهز للاستخدام")

    loadStudentsFromFirebase().then(() => {
      console.log("تم تحميل", registeredStudents.length, "طلاب")
      updateAdminDisplay()
    })

    const dbNotice = document.getElementById("dbStatusNotice")
    if (dbNotice) {
      dbNotice.style.display = "none"
    }

    return true
  } else {
    isFirebaseReady = false
    updateConnectionStatus("offline")
    console.warn("⚠️ Firebase غير متاح - سيتم استخدام التخزين المحلي")

    registeredStudents = JSON.parse(localStorage.getItem("registeredStudents")) || []
    // تعيين UID للطلاب المحليين
    registeredStudents.forEach((student) => {
      if (!student.uid) {
        student.uid = generateStudentUID(student)
      }
    })
    updateAdminDisplay()

    const dbNotice = document.getElementById("dbStatusNotice")
    if (dbNotice) {
      dbNotice.style.display = "flex"
    }

    return false
  }
}

// دالة مساعدة لتحديث عرض لوحة التحكم
function updateAdminDisplay() {
  if (document.getElementById("adminPanel") && document.getElementById("adminPanel").classList.contains("active")) {
    displayFoujStats()
    displayStudentsTable()
    updateFoujFilters()
  }
}

// حفظ طالب جديد في Firebase
async function saveStudentToFirebase(studentData) {
  if (!isFirebaseReady) {
    console.log("📱 Firebase غير متاح - حفظ محلي")
    studentData.uid = generateStudentUID(studentData)
    studentData.registrationDate = new Date().toLocaleDateString("ar-DZ")
    registeredStudents.unshift(studentData)
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents))
    return true
  }

  try {
    updateConnectionStatus("connecting")

    const docRef = await db.collection("students").add({
      ...studentData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    })

    studentData.firebaseId = docRef.id
    studentData.uid = generateStudentUID(studentData)
    studentData.registrationDate = new Date().toLocaleDateString("ar-DZ")
    registeredStudents.unshift(studentData)
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents))

    updateConnectionStatus("connected")
    console.log("✅ تم حفظ الطالب في Firebase:", docRef.id)
    return true
  } catch (error) {
    console.error("❌ خطأ في حفظ البيانات:", error)
    updateConnectionStatus("offline")

    studentData.uid = generateStudentUID(studentData)
    studentData.registrationDate = new Date().toLocaleDateString("ar-DZ")
    registeredStudents.unshift(studentData)
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents))
    return true
  }
}

// تحميل البيانات من Firebase
async function loadStudentsFromFirebase() {
  if (!isFirebaseReady) {
    console.log("📱 تحميل البيانات المحلية")
    registeredStudents = JSON.parse(localStorage.getItem("registeredStudents")) || []
    // تعيين UID للطلاب المحليين
    registeredStudents.forEach((student) => {
      if (!student.uid) {
        student.uid = generateStudentUID(student)
      }
    })
    return registeredStudents
  }

  try {
    showLoadingIndicator(true)
    updateConnectionStatus("connecting")

    const snapshot = await db.collection("students").orderBy("timestamp", "desc").get()

    const students = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      const student = {
        firebaseId: doc.id,
        ...data,
      }
      student.uid = generateStudentUID(student)
      students.push(student)
    })

    registeredStudents = students
    localStorage.setItem("registeredStudents", JSON.stringify(students))

    updateConnectionStatus("connected")
    console.log(`✅ تم تحميل ${students.length} طالب من Firebase`)

    return students
  } catch (error) {
    console.error("❌ خطأ في تحميل البيانات:", error)
    updateConnectionStatus("offline")

    const localData = JSON.parse(localStorage.getItem("registeredStudents")) || []
    localData.forEach((student) => {
      if (!student.uid) {
        student.uid = generateStudentUID(student)
      }
    })
    registeredStudents = localData
    return localData
  } finally {
    showLoadingIndicator(false)
  }
}

// إظهار/إخفاء مؤشر التحميل
function showLoadingIndicator(show) {
  const indicator = document.getElementById("loadingIndicator")
  if (indicator) {
    indicator.style.display = show ? "block" : "none"
  }
}

// دوال إدارة الأفواج
function getFoujName(location, schedule) {
  const key = `${location}_${schedule}`
  return FOUJ_NAMES[key] || `فوج ${location}`
}

function getFoujKey(location, schedule) {
  return `${location}_${schedule}`
}

function checkFoujCapacity(location, schedule) {
  const foujStudents = registeredStudents.filter((s) => s.location === location && s.schedule === schedule)
  return foujStudents.length
}

// عرض لافتة محسنة
function showAlert(message, type = "success", duration = 5000) {
  console.log(`🚨 عرض لافتة: ${type} - ${message}`)

  // إزالة أي لافتة موجودة
  const existingAlerts = document.querySelectorAll(".custom-alert")
  existingAlerts.forEach((alert) => alert.remove())

  const alertDiv = document.createElement("div")
  alertDiv.className = "custom-alert"
  alertDiv.style.position = "fixed"
  alertDiv.style.top = "0"
  alertDiv.style.left = "0"
  alertDiv.style.width = "100%"
  alertDiv.style.padding = "20px"
  alertDiv.style.fontSize = "1.2rem"
  alertDiv.style.fontWeight = "700"
  alertDiv.style.textAlign = "center"
  alertDiv.style.zIndex = "99999"
  alertDiv.style.display = "flex"
  alertDiv.style.justifyContent = "center"
  alertDiv.style.alignItems = "center"
  alertDiv.style.gap = "15px"
  alertDiv.style.color = "white"
  alertDiv.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)"
  alertDiv.style.animation = "slideInFromTop 0.5s ease"
  alertDiv.style.transform = "translateY(0)"
  alertDiv.style.transition = "all 0.3s ease"

  // تحديد اللون والأيقونة حسب النوع
  if (type === "success") {
    alertDiv.style.background = "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)"
    alertDiv.innerHTML = `<i class="fas fa-check-circle" style="font-size: 1.5rem;"></i> <span>${message}</span>`
  } else if (type === "warning") {
    alertDiv.style.background = "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)"
    alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size: 1.5rem;"></i> <span>${message}</span>`
  } else if (type === "danger") {
    alertDiv.style.background = "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)"
    alertDiv.innerHTML = `<i class="fas fa-times-circle" style="font-size: 1.5rem;"></i> <span>${message}</span>`
  }

  // إضافة اللافتة إلى الصفحة
  document.body.appendChild(alertDiv)
  console.log("✅ تم إضافة اللافتة إلى الصفحة")

  // إخفاء اللافتة بعد المدة المحددة
  setTimeout(() => {
    if (alertDiv && alertDiv.parentNode) {
      alertDiv.style.transform = "translateY(-100%)"
      alertDiv.style.opacity = "0"
      setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
          alertDiv.remove()
          console.log("🗑️ تم إزالة اللافتة")
        }
      }, 300)
    }
  }, duration)

  return alertDiv
}

// ===== دوال واجهة المستخدم =====

function showConsent() {
  document.getElementById("consentModal").style.display = "flex"
}

function closeConsent() {
  document.getElementById("consentModal").style.display = "none"
}

function goToRegistration() {
  closeConsent()
  showPage("registrationPage")
}

function goToHome() {
  showPage("homePage")
}

function showPage(pageId) {
  console.log("تغيير الصفحة إلى:", pageId)
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active")
    page.style.display = "none"
  })

  const targetPage = document.getElementById(pageId)
  if (targetPage) {
    targetPage.classList.add("active")
    targetPage.style.display = "block"
    console.log("تم عرض الصفحة:", pageId)

    if (pageId === "adminPanel") {
      updateAdminDisplay()
    }
  } else {
    console.error("الصفحة غير موجودة:", pageId)
  }
}

// فحص سعة الفوج وإظهار إشعار إذا لزم الأمر
function checkAndShowFoujNotice() {
  const selectedLocation = document.querySelector('input[name="location"]:checked')
  const selectedSchedule = document.querySelector('input[name="schedule"]:checked')
  const notice = document.getElementById("foujFullNotice")
  const submitBtn = document.querySelector(".submit-btn")

  if (!selectedLocation || !selectedSchedule) {
    if (notice) notice.style.display = "none"
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.style.opacity = "0.5"
    }
    return false
  }

  const currentCount = checkFoujCapacity(selectedLocation.value, selectedSchedule.value)
  const foujName = getFoujName(selectedLocation.value, selectedSchedule.value)

  if (currentCount >= MAX_STUDENTS_PER_FOUJ) {
    if (notice) {
      notice.style.display = "flex"
      notice.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>تنبيه: ${foujName} مكتمل (${MAX_STUDENTS_PER_FOUJ} طالب). لا يمكن التسجيل في هذا الفوج.</span>
            `
    }
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.style.opacity = "0.5"
    }
    return false
  } else {
    if (notice) notice.style.display = "none"
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.style.opacity = "1"
    }
    return true
  }
}

// تبديل عرض حقل الثانوية
function toggleSchoolField(radio) {
  const schoolField = document.getElementById("schoolField")
  const schoolSelect = document.getElementById("school")
  if (radio.value === "نظامي") {
    schoolField.style.display = "block"
    schoolSelect.required = true
  } else {
    schoolField.style.display = "none"
    schoolSelect.required = false
    schoolSelect.value = ""
  }
}

// تحديث خيارات التوقيت حسب المكان والشعبة
function updateLocationOptions(radio) {
  const scheduleOptions = document.getElementById("scheduleOptions")
  const scheduleChoices = document.getElementById("scheduleChoices")
  const mapContainer = document.getElementById("mapContainer")
  const mapFrame = document.getElementById("mapFrame")

  if (!radio.checked) {
    scheduleOptions.style.display = "none"
    mapContainer.style.display = "none"
    scheduleChoices.innerHTML = ""
    return
  }

  scheduleOptions.style.display = "block"
  mapContainer.style.display = "block"

  if (radio.value === "رأس الوادي") {
    scheduleChoices.innerHTML = `
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم الجمعة صباحا الساعة 9:00" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕘</span>
                يوم الجمعة صباحا الساعة 9:00
            </label>
        `
    mapFrame.innerHTML = `
            <iframe src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d267.5754578298012!2d5.04348127440132!3d35.95112153179717!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sdz!4v1754072042503!5m2!1sen!2sdz" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        `
  } else if (radio.value === "برج بوعريريج") {
    updateScheduleOptions()
    mapFrame.innerHTML = `
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d267.1373246941547!2d4.779120692612777!3d36.080281128944634!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x128cbda0b49fb9f5%3A0x3b9a2f868e369a7f!2sProf%20Math.%20Belayadi%20Akram!5e1!3m2!1sen!2sdz!4v1754072246845!5m2!1sen!2sdz" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        `
  }
}

// تحديث خيارات التوقيت حسب الشعبة لبرج بوعريريج
function updateScheduleOptions() {
  const selectedLocation = document.querySelector('input[name="location"]:checked')
  const selectedBranch = document.querySelector('input[name="branch"]:checked')
  const scheduleChoices = document.getElementById("scheduleChoices")

  if (!selectedLocation || selectedLocation.value !== "برج بوعريريج" || !selectedBranch) {
    scheduleChoices.innerHTML = ""
    return
  }

  let scheduleHTML = ""
  if (selectedBranch.value === "رياضيات" || selectedBranch.value === "تقني رياضي") {
    scheduleHTML = `
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕗</span>
                يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)
            </label>
        `
  } else if (selectedBranch.value === "علوم تجريبية") {
    scheduleHTML = `
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم السبت 10:30 صباحا (علوم تجريبية)" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕥</span>
                يوم السبت 10:30 صباحا (علوم تجريبية)
            </label>
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕐</span>
                يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)
            </label>
        `
  }
  scheduleChoices.innerHTML = scheduleHTML
}

// ===== دوال تأكيد وتغيير الفوج =====

function confirmFouj() {
  document.getElementById("foujConfirmModal").style.display = "none"
  finishStudentRegistration(pendingStudentData)
}

function showFoujChangeModal() {
  document.getElementById("foujConfirmModal").style.display = "none"
  populateFoujChoices()
  document.getElementById("foujChangeModal").style.display = "flex"
}

function populateFoujChoices() {
  const foujChoices = document.getElementById("foujChoicesList")
  foujChoices.innerHTML = ""
  FOUJ_OPTIONS.forEach((opt) => {
    foujChoices.innerHTML += `
            <label class="radio-label">
                <input required type="radio" name="chosenFouj" value="${opt.key}">
                ${opt.name} (${opt.schedule})
            </label>
        `
  })
}

async function finishStudentRegistration(studentData) {
  showLoadingIndicator(true)

  const success = await saveStudentToFirebase(studentData)

  showLoadingIndicator(false)

  if (success) {
    showPage("confirmationPage")
    showAlert("✅ تم التسجيل بنجاح!", "success")

    const form = document.getElementById("registrationForm")
    if (form) form.reset()

    const schoolField = document.getElementById("schoolField")
    if (schoolField) schoolField.style.display = "none"

    const scheduleOptions = document.getElementById("scheduleOptions")
    const mapContainer = document.getElementById("mapContainer")
    if (scheduleOptions) scheduleOptions.style.display = "none"
    if (mapContainer) mapContainer.style.display = "none"

    updateAdminDisplay()
  } else {
    showAlert("❌ حدث خطأ أثناء التسجيل. حاول مرة أخرى.", "danger")
  }
}

// ===== معالجة إرسال النموذج =====

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm")
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault()

      const formData = new FormData(this)

      const studentData = {
        studentType: formData.get("studentType"),
        school: formData.get("school") || "غير محدد",
        fullName: formData.get("fullName"),
        birthDate: formData.get("birthDate"),
        branch: formData.get("branch"),
        averageGrade: formData.get("averageGrade"),
        mathLevel: formData.get("mathLevel"),
        personalPhone: formData.get("personalPhone"),
        guardianPhone: formData.get("guardianPhone"),
        location: formData.get("location"),
        schedule: formData.get("schedule"),
      }

      if (!studentData.studentType || !studentData.location || !studentData.schedule) {
        showAlert("⚠️ يرجى ملء جميع الحقول المطلوبة.", "warning")
        return
      }

      if (!checkAndShowFoujNotice()) {
        showAlert("❌ عذراً، هذا الفوج مكتمل. يرجى اختيار فوج آخر.", "danger")
        return
      }

      pendingStudentData = studentData

      const foujName = getFoujName(studentData.location, studentData.schedule)
      document.getElementById("selectedFoujName").textContent = foujName

      document.getElementById("foujConfirmModal").style.display = "flex"
    })
  }

  const changeFoujForm = document.getElementById("changeFoujForm")
  if (changeFoujForm) {
    changeFoujForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const chosenFoujKey = document.querySelector('input[name="chosenFouj"]:checked')
      if (!chosenFoujKey) {
        showAlert("⚠️ الرجاء اختيار فوج جديد.", "warning")
        return
      }

      const fouj = FOUJ_OPTIONS.find((f) => f.key === chosenFoujKey.value)
      if (fouj) {
        pendingStudentData.location = fouj.location
        pendingStudentData.schedule = fouj.schedule

        document.getElementById("foujChangeModal").style.display = "none"
        finishStudentRegistration(pendingStudentData)
      }
    })
  }

  // معالج نموذج التعديل
  const editForm = document.getElementById("editStudentForm")
  if (editForm) {
    editForm.addEventListener("submit", saveEditedStudent)
  }
})

// ===== دوال لوحة التحكم =====

function displayFoujStats() {
  const container = document.getElementById("foujStatsContainer")
  if (!container) return

  console.log("عرض إحصائيات الأفواج - عدد الطلاب:", registeredStudents.length)

  const foujStats = {}
  FOUJ_OPTIONS.forEach((fouj) => {
    const students = registeredStudents.filter((s) => s.location === fouj.location && s.schedule === fouj.schedule)
    foujStats[fouj.key] = {
      name: fouj.name,
      count: students.length,
      capacity: MAX_STUDENTS_PER_FOUJ,
      students: students,
    }
  })

  container.innerHTML = ""
  Object.values(foujStats).forEach((fouj) => {
    const percentage = (fouj.count / fouj.capacity) * 100
    const isFull = fouj.count >= fouj.capacity
    const isEmpty = fouj.count === 0

    let cardClass = "stat-card clickable"
    if (isEmpty) cardClass += " empty"
    if (currentSelectedFouj === fouj.name) cardClass += " active"

    const cardHtml = `
            <div class="${cardClass}" onclick="filterByFoujName('${fouj.name}')">
                <h4>${fouj.name}</h4>
                <div class="stat-number">${fouj.count}/${fouj.capacity}</div>
                <div class="capacity-bar">
                    <div class="capacity-fill ${isFull ? "capacity-full" : ""}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `
    container.innerHTML += cardHtml
  })
}

function displayStudentsTable(filteredStudents = null) {
  const tableBody = document.getElementById("studentsTableBody")
  if (!tableBody) return

  const studentsToShow = filteredStudents || registeredStudents
  console.log("عرض جدول الطلاب - عدد الطلاب:", studentsToShow.length)

  if (studentsToShow.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                    لا توجد تسجيلات ${currentSelectedFouj ? `في ${currentSelectedFouj}` : "حتى الآن"}
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = ""
  studentsToShow.forEach((student, index) => {
    const foujName = getFoujName(student.location, student.schedule)
    const registrationDate =
      student.registrationDate || student.createdAt?.substring(0, 10) || new Date().toLocaleDateString("ar-DZ")

    // تأكد من وجود UID للطالب
    if (!student.uid) {
      student.uid = generateStudentUID(student)
    }

    const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="fouj-badge">${foujName}</span></td>
                <td><strong>${student.fullName}</strong></td>
                <td>${student.studentType}</td>
                <td>${student.school || "غير محدد"}</td>
                <td>${student.branch}</td>
                <td>${student.averageGrade}</td>
                <td>${student.mathLevel}</td>
                <td>${student.personalPhone}</td>
                <td>${student.guardianPhone}</td>
                <td>${student.location}</td>
                <td>${student.schedule.length > 30 ? student.schedule.substring(0, 30) + "..." : student.schedule}</td>
                <td>${registrationDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editStudent('${student.uid}')">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn-delete" onclick="confirmDeleteStudent('${student.uid}', '${student.fullName.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `
    tableBody.innerHTML += row
  })
}

function filterByFoujName(foujName) {
  console.log("فلترة بالفوج:", foujName)

  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.remove("active")
  })

  const selectedCard = document.querySelector(`[onclick="filterByFoujName('${foujName}')"]`)
  if (selectedCard) {
    selectedCard.classList.add("active")
  }

  if (currentSelectedFouj === foujName) {
    currentSelectedFouj = ""
    document.getElementById("currentFoujTitle").textContent = "جميع الطلاب المسجلين"
    displayStudentsTable()
    if (selectedCard) selectedCard.classList.remove("active")
  } else {
    const filtered = registeredStudents.filter((s) => {
      const studentFoujName = getFoujName(s.location, s.schedule)
      return studentFoujName === foujName
    })

    currentSelectedFouj = foujName
    document.getElementById("currentFoujTitle").textContent = `طلاب ${foujName} (${filtered.length})`
    displayStudentsTable(filtered)
  }
}

function updateFoujFilters() {
  const foujFilter = document.getElementById("foujFilter")
  if (!foujFilter) return

  const selectedValue = foujFilter.value
  foujFilter.innerHTML = '<option value="">جميع الأفواج</option>'

  const activeFoujs = new Set()
  registeredStudents.forEach((student) => {
    const foujName = getFoujName(student.location, student.schedule)
    activeFoujs.add(foujName)
  })

  Array.from(activeFoujs)
    .sort()
    .forEach((foujName) => {
      const option = document.createElement("option")
      option.value = foujName
      option.textContent = foujName
      foujFilter.appendChild(option)
    })

  if (selectedValue && Array.from(activeFoujs).includes(selectedValue)) {
    foujFilter.value = selectedValue
  }
}

function filterByFouj() {
  const foujFilter = document.getElementById("foujFilter")
  const selectedFouj = foujFilter ? foujFilter.value : ""

  if (selectedFouj) {
    filterByFoujName(selectedFouj)
  } else {
    currentSelectedFouj = ""
    document.getElementById("currentFoujTitle").textContent = "جميع الطلاب المسجلين"
    displayStudentsTable()
    document.querySelectorAll(".stat-card").forEach((card) => {
      card.classList.remove("active")
    })
  }
}

function filterStudents() {
  const branchFilter = document.getElementById("branchFilter")
  const locationFilter = document.getElementById("locationFilter")

  let filtered = registeredStudents

  if (branchFilter && branchFilter.value) {
    filtered = filtered.filter((s) => s.branch === branchFilter.value)
  }

  if (locationFilter && locationFilter.value) {
    filtered = filtered.filter((s) => s.location === locationFilter.value)
  }

  if (currentSelectedFouj) {
    filtered = filtered.filter((s) => {
      const foujName = getFoujName(s.location, s.schedule)
      return foujName === currentSelectedFouj
    })
  }

  displayStudentsTable(filtered)

  let title = "الطلاب المسجلين"
  const filters = []
  if (currentSelectedFouj) filters.push(currentSelectedFouj)
  if (branchFilter && branchFilter.value) filters.push(branchFilter.value)
  if (locationFilter && locationFilter.value) filters.push(locationFilter.value)

  if (filters.length > 0) {
    title = `${title} - ${filters.join(" - ")} (${filtered.length})`
  } else {
    title = `${title} (${filtered.length})`
  }

  document.getElementById("currentFoujTitle").textContent = title
}

// ===== دوال التعديل الكاملة =====

// دالة فتح نافذة التعديل وتعبئة البيانات
function editStudent(studentUID) {
  console.log("✏️ فتح نافذة تعديل للطالب:", studentUID)

  const student = findStudentByUID(studentUID)

  if (!student) {
    console.error("❌ فشل العثور على الطالب للتعديل")
    showAlert("❌ فشل في العثور على الطالب في السجلات", "danger")
    return
  }

  console.log("✅ تم العثور على الطالب للتعديل:", student.fullName)

  // حفظ UID الطالب الحالي
  currentEditingStudentUID = studentUID

  // تعبئة البيانات في النموذج

  // نوع الطالب
  const studentTypeRadios = document.querySelectorAll('input[name="editStudentType"]')
  studentTypeRadios.forEach((radio) => {
    radio.checked = radio.value === student.studentType
  })

  // الثانوية
  const schoolContainer = document.getElementById("editSchoolContainer")
  const schoolSelect = document.getElementById("editSchool")
  if (student.studentType === "نظامي") {
    schoolContainer.style.display = "block"
    schoolSelect.required = true
    schoolSelect.value = student.school || ""
  } else {
    schoolContainer.style.display = "none"
    schoolSelect.required = false
    schoolSelect.value = ""
  }

  // البيانات الأساسية
  document.getElementById("editFullName").value = student.fullName || ""
  document.getElementById("editBirthDate").value = student.birthDate || ""
  document.getElementById("editAverageGrade").value = student.averageGrade || ""
  document.getElementById("editMathLevel").value = student.mathLevel || ""
  document.getElementById("editPersonalPhone").value = student.personalPhone || ""
  document.getElementById("editGuardianPhone").value = student.guardianPhone || ""

  // الشعبة
  const branchRadios = document.querySelectorAll('input[name="editBranch"]')
  branchRadios.forEach((radio) => {
    radio.checked = radio.value === student.branch
  })

  // المكان
  const locationRadios = document.querySelectorAll('input[name="editLocation"]')
  locationRadios.forEach((radio) => {
    radio.checked = radio.value === student.location
  })

  // تحديث خيارات التوقيت
  updateEditScheduleOptions()

  // تحديد التوقيت المحدد
  setTimeout(() => {
    const scheduleRadios = document.querySelectorAll('input[name="editSchedule"]')
    scheduleRadios.forEach((radio) => {
      radio.checked = radio.value === student.schedule
    })
  }, 100)

  // إظهار النافذة
  document.getElementById("editStudentModal").style.display = "flex"
}

// دالة التحكم في عرض حقل الثانوية
function editToggleSchool(radio) {
  const schoolContainer = document.getElementById("editSchoolContainer")
  const schoolSelect = document.getElementById("editSchool")

  if (radio.value === "نظامي") {
    schoolContainer.style.display = "block"
    schoolSelect.required = true
  } else {
    schoolContainer.style.display = "none"
    schoolSelect.required = false
    schoolSelect.value = ""
  }
}

// دالة تحديث خيارات التوقيت في نافذة التعديل
function updateEditScheduleOptions() {
  const selectedLocation = document.querySelector('input[name="editLocation"]:checked')
  const selectedBranch = document.querySelector('input[name="editBranch"]:checked')
  const scheduleChoices = document.getElementById("editScheduleChoices")

  if (!selectedLocation) {
    scheduleChoices.innerHTML = ""
    return
  }

  let scheduleHTML = ""

  if (selectedLocation.value === "رأس الوادي") {
    scheduleHTML = `
            <label class="radio-label">
                <input required type="radio" name="editSchedule" value="يوم الجمعة صباحا الساعة 9:00">
                <span class="radio-icon">🕘</span> يوم الجمعة صباحا الساعة 9:00
            </label>
        `
  } else if (selectedLocation.value === "برج بوعريريج" && selectedBranch) {
    if (selectedBranch.value === "رياضيات" || selectedBranch.value === "تقني رياضي") {
      scheduleHTML = `
                <label class="radio-label">
                    <input required type="radio" name="editSchedule" value="يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)">
                    <span class="radio-icon">🕗</span> يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)
                </label>
            `
    } else if (selectedBranch.value === "علوم تجريبية") {
      scheduleHTML = `
                <label class="radio-label">
                    <input required type="radio" name="editSchedule" value="يوم السبت 10:30 صباحا (علوم تجريبية)">
                    <span class="radio-icon">🕥</span> يوم السبت 10:30 صباحا (علوم تجريبية)
                </label>
                <label class="radio-label">
                    <input required type="radio" name="editSchedule" value="يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)">
                    <span class="radio-icon">🕐</span> يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)
                </label>
            `
    }
  }

  scheduleChoices.innerHTML = scheduleHTML
}

// دالة حفظ التغييرات
async function saveEditedStudent(e) {
  e.preventDefault()

  if (!currentEditingStudentUID) {
    showAlert("❌ خطأ: لا يوجد طالب قيد التعديل", "danger")
    return
  }

  // جمع البيانات المُحدثة
  const updatedData = {
    studentType: document.querySelector('input[name="editStudentType"]:checked')?.value,
    school: document.getElementById("editSchool").value || "غير محدد",
    fullName: document.getElementById("editFullName").value.trim(),
    birthDate: document.getElementById("editBirthDate").value,
    branch: document.querySelector('input[name="editBranch"]:checked')?.value,
    averageGrade: document.getElementById("editAverageGrade").value,
    mathLevel: document.getElementById("editMathLevel").value,
    personalPhone: document.getElementById("editPersonalPhone").value.trim(),
    guardianPhone: document.getElementById("editGuardianPhone").value.trim(),
    location: document.querySelector('input[name="editLocation"]:checked')?.value,
    schedule: document.querySelector('input[name="editSchedule"]:checked')?.value,
  }

  // التحقق من صحة البيانات
  if (!updatedData.studentType || !updatedData.fullName || !updatedData.location || !updatedData.schedule) {
    showAlert("⚠️ يرجى ملء جميع الحقول المطلوبة", "warning")
    return
  }

  console.log("💾 حفظ بيانات محدثة للطالب:", currentEditingStudentUID)

  // العثور على الطالب في المصفوفة
  const studentIndex = registeredStudents.findIndex((s) => {
    const sUID = s.uid || generateStudentUID(s)
    return sUID === currentEditingStudentUID
  })

  if (studentIndex === -1) {
    showAlert("❌ فشل في العثور على الطالب للتحديث", "danger")
    return
  }

  const originalStudent = registeredStudents[studentIndex]

  // إظهار مؤشر التحميل
  showLoadingIndicator(true)

  try {
    // تحديث البيانات المحلية
    registeredStudents[studentIndex] = { ...originalStudent, ...updatedData }

    // حفظ في التخزين المحلي
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents))

    // تحديث في Firebase إذا كان متاحاً
    if (isFirebaseReady && originalStudent.firebaseId) {
      try {
        await db.collection("students").doc(originalStudent.firebaseId).update(updatedData)
        console.log("✅ تم تحديث البيانات في Firebase")
      } catch (firebaseError) {
        console.error("⚠️ خطأ في تحديث Firebase:", firebaseError)
        showAlert("⚠️ تم التحديث محلياً - مشكلة في الاتصال بقاعدة البيانات", "warning")
      }
    }

    // إغلاق النافذة
    closeEditStudentModal()

    // تحديث العرض
    updateAdminDisplay()

    // إظهار رسالة نجاح
    showAlert(`✅ تم تحديث بيانات الطالب "${updatedData.fullName}" بنجاح`, "success")

    console.log("🎉 تم حفظ التغييرات بنجاح")
  } catch (error) {
    console.error("💥 خطأ في حفظ التغييرات:", error)
    showAlert("❌ حدث خطأ أثناء حفظ التغييرات", "danger")
  } finally {
    showLoadingIndicator(false)
  }
}

// دالة إغلاق نافذة التعديل
function closeEditStudentModal() {
  const modal = document.getElementById("editStudentModal")
  if (modal) {
    modal.style.display = "none"
  }
  currentEditingStudentUID = null
  console.log("🚪 تم إغلاق نافذة التعديل")
}

// ===== دوال الحذف =====

// حذف طالب مع تأكيد
function confirmDeleteStudent(studentUID, studentName) {
  console.log("🗑️ طلب حذف الطالب:", studentUID, studentName)

  // حفظ معرف الطالب المراد حذفه
  studentToDelete = studentUID

  // تحديث اسم الطالب في النافذة
  const deleteNameElement = document.getElementById("deleteStudentName")
  if (deleteNameElement) {
    deleteNameElement.textContent = studentName
  }

  // إظهار نافذة التأكيد
  const deleteModal = document.getElementById("deleteConfirmModal")
  if (deleteModal) {
    deleteModal.style.display = "flex"
  }
}

// تأكيد الحذف
function proceedWithDelete() {
  if (studentToDelete) {
    console.log("✅ تم تأكيد الحذف من المستخدم")
    deleteStudent(studentToDelete)
    cancelDelete()
  }
}

// إلغاء الحذف
function cancelDelete() {
  console.log("❌ تم إلغاء الحذف من المستخدم")
  studentToDelete = null
  const deleteModal = document.getElementById("deleteConfirmModal")
  if (deleteModal) {
    deleteModal.style.display = "none"
  }
  showAlert("⚪ تم إلغاء عملية الحذف", "warning", 3000)
}

// حذف طالب
async function deleteStudent(studentUID) {
  console.log("🗑️ بدء عملية حذف الطالب:", studentUID)

  // البحث عن الطالب بـ UID
  const student = findStudentByUID(studentUID)

  if (!student) {
    console.error("❌ فشل العثور على الطالب للحذف")
    showAlert("❌ فشل في العثور على الطالب في السجلات", "danger", 4000)
    return
  }

  console.log("✅ تم العثور على الطالب للحذف:", student.fullName)

  // إظهار مؤشر التحميل
  showLoadingIndicator(true)
  showAlert("⏳ جاري حذف الطالب...", "warning", 2000)

  try {
    // محاولة حذف من Firebase إذا كان متاحاً
    if (isFirebaseReady && student.firebaseId) {
      console.log("🔥 محاولة حذف من Firebase...")
      try {
        await db.collection("students").doc(student.firebaseId).delete()
        console.log("✅ تم حذف الطالب من Firebase بنجاح")
      } catch (firebaseError) {
        console.error("⚠️ خطأ في حذف الطالب من Firebase:", firebaseError)
        showAlert("⚠️ تم الحذف محلياً فقط (مشكلة في Firebase)", "warning", 3000)
      }
    }

    // العثور على فهرس الطالب في المصفوفة
    const studentIndex = registeredStudents.findIndex((s) => s.uid === studentUID)

    if (studentIndex === -1) {
      console.error("❌ فشل في العثور على فهرس الطالب")
      showAlert("❌ خطأ في فهرس الطالب", "danger")
      return
    }

    // حذف من المصفوفة المحلية
    registeredStudents.splice(studentIndex, 1)
    console.log("✅ تم حذف الطالب من المصفوفة المحلية")

    // تحديث التخزين المحلي
    localStorage.setItem("registeredStudents", JSON.stringify(registeredStudents))
    console.log("✅ تم تحديث التخزين المحلي")

    // تحديث العرض
    updateAdminDisplay()
    console.log("✅ تم تحديث عرض لوحة التحكم")

    // إظهار رسالة نجاح
    showAlert(`✅ تم حذف الطالب "${student.fullName}" بنجاح`, "success", 4000)

    console.log("🎉 تمت عملية الحذف بنجاح")
  } catch (error) {
    console.error("💥 خطأ عام في حذف الطالب:", error)
    showAlert("❌ حدث خطأ غير متوقع أثناء حذف الطالب", "danger", 4000)
  } finally {
    showLoadingIndicator(false)
  }
}

// ===== دوال التصدير =====

// تصدير البيانات إلى Excel
function exportAllToExcel() {
  if (registeredStudents.length === 0) {
    showAlert("❌ لا توجد بيانات للتصدير", "danger")
    return
  }

  const headers = [
    "الرقم",
    "الفوج",
    "الاسم واللقب",
    "نوع الطالب",
    "الثانوية",
    "الشعبة",
    "المعدل",
    "مستوى الرياضيات",
    "الهاتف الشخصي",
    "هاتف الولي",
    "مكان الدروس",
    "التوقيت",
    "تاريخ التسجيل",
  ]

  let csvContent = "\uFEFF" // BOM لدعم UTF-8
  csvContent += headers.join(",") + "\n"

  registeredStudents.forEach((student, index) => {
    const foujName = getFoujName(student.location, student.schedule)
    const registrationDate =
      student.registrationDate || student.createdAt?.substring(0, 10) || new Date().toLocaleDateString("ar-DZ")

    const row = [
      index + 1,
      foujName,
      student.fullName,
      student.studentType,
      student.school || "غير محدد",
      student.branch,
      student.averageGrade,
      student.mathLevel,
      student.personalPhone,
      student.guardianPhone,
      student.location,
      student.schedule,
      registrationDate,
    ]

    csvContent += row.map((field) => `"${field}"`).join(",") + "\n"
  })

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `تسجيلات_الطلاب_${new Date().toLocaleDateString("ar-DZ")}.csv`
  link.click()

  showAlert(`✅ تم تصدير ${registeredStudents.length} طالب بنجاح`, "success")
}

function exportCurrentFoujToExcel() {
  let studentsToExport = registeredStudents
  let filename = "جميع_الطلاب"

  if (currentSelectedFouj) {
    studentsToExport = registeredStudents.filter((s) => {
      const foujName = getFoujName(s.location, s.schedule)
      return foujName === currentSelectedFouj
    })
    filename = currentSelectedFouj.replace(/\s+/g, "_")
  }

  if (studentsToExport.length === 0) {
    showAlert("❌ لا توجد بيانات للتصدير", "danger")
    return
  }

  const headers = [
    "الرقم",
    "الاسم واللقب",
    "نوع الطالب",
    "الثانوية",
    "الشعبة",
    "المعدل",
    "مستوى الرياضيات",
    "الهاتف الشخصي",
    "هاتف الولي",
    "مكان الدروس",
    "التوقيت",
    "تاريخ التسجيل",
  ]

  let csvContent = "\uFEFF"
  csvContent += headers.join(",") + "\n"

  studentsToExport.forEach((student, index) => {
    const registrationDate =
      student.registrationDate || student.createdAt?.substring(0, 10) || new Date().toLocaleDateString("ar-DZ")

    const row = [
      index + 1,
      student.fullName,
      student.studentType,
      student.school || "غير محدد",
      student.branch,
      student.averageGrade,
      student.mathLevel,
      student.personalPhone,
      student.guardianPhone,
      student.location,
      student.schedule,
      registrationDate,
    ]

    csvContent += row.map((field) => `"${field}"`).join(",") + "\n"
  })

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toLocaleDateString("ar-DZ")}.csv`
  link.click()

  showAlert(`✅ تم تصدير ${studentsToExport.length} طالب بنجاح`, "success")
}

function exportToJSON() {
  if (registeredStudents.length === 0) {
    showAlert("❌ لا توجد بيانات للتصدير", "danger")
    return
  }

  const backupData = {
    exportDate: new Date().toISOString(),
    totalStudents: registeredStudents.length,
    students: registeredStudents,
  }

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json;charset=utf-8;",
  })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `نسخة_احتياطية_${new Date().toLocaleDateString("ar-DZ")}.json`
  link.click()

  showAlert("✅ تم إنشاء النسخة الاحتياطية بنجاح", "success")
}

async function refreshData() {
  console.log("🔄 تحديث البيانات...")
  await loadStudentsFromFirebase()
  updateAdminDisplay()
  showAlert("🔄 تم تحديث البيانات بنجاح!", "success")
}

// ===== دوال لوحة التحكم =====

function accessAdminPanel() {
  showPasswordModal()
}

function showPasswordModal() {
  const modal = document.getElementById("passwordModal")
  if (modal) {
    modal.style.display = "flex"
    const passwordInput = document.getElementById("adminPassword")
    if (passwordInput) {
      setTimeout(() => passwordInput.focus(), 100)
    }
  }
}

function confirmPassword() {
  const passwordInput = document.getElementById("adminPassword")
  const password = passwordInput ? passwordInput.value : ""

  if (password === "admin123") {
    cancelPassword()
    showPage("adminPanel")
    loadStudentsFromFirebase().then(() => {
      updateAdminDisplay()
    })
  } else if (password.trim() === "") {
    showAlert("⚠️ يرجى إدخال كلمة المرور", "warning")
    if (passwordInput) passwordInput.focus()
  } else {
    showAlert("❌ كلمة مرور خاطئة", "danger")
    if (passwordInput) {
      passwordInput.value = ""
      passwordInput.focus()
    }
  }
}

function cancelPassword() {
  const modal = document.getElementById("passwordModal")
  const passwordInput = document.getElementById("adminPassword")
  if (modal) modal.style.display = "none"
  if (passwordInput) passwordInput.value = ""
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("adminPassword")
  const toggleIcon = document.getElementById("passwordToggleIcon")
  if (passwordInput && toggleIcon) {
    if (passwordInput.type === "password") {
      passwordInput.type = "text"
      toggleIcon.className = "fas fa-eye-slash"
    } else {
      passwordInput.type = "password"
      toggleIcon.className = "fas fa-eye"
    }
  }
}

// تهيئة التطبيق
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 تحميل التطبيق...")

  // تهيئة Firebase
  initializeFirebase()

  // إنشاء زر لوحة التحكم
  createAdminButton()
})

// إنشاء زر لوحة التحكم
function createAdminButton() {
  const existingButton = document.querySelector(".admin-control-button")
  if (existingButton) {
    existingButton.remove()
  }

  const adminBtn = document.createElement("button")
  adminBtn.className = "admin-control-button"
  adminBtn.innerHTML = '<i class="fas fa-cogs"></i>'
  adminBtn.title = "لوحة التحكم الإدارية"
  adminBtn.style.position = "fixed"
  adminBtn.style.top = "20px"
  adminBtn.style.right = "20px"
  adminBtn.style.zIndex = "9999"
  adminBtn.style.backgroundColor = "rgba(255, 255, 255, 0.95)"
  adminBtn.style.color = "#000000"
  adminBtn.style.border = "3px solid #000000"
  adminBtn.style.padding = "15px"
  adminBtn.style.fontSize = "24px"
  adminBtn.style.cursor = "pointer"
  adminBtn.style.borderRadius = "50%"
  adminBtn.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)"
  adminBtn.style.transition = "all 0.3s ease"
  adminBtn.style.width = "60px"
  adminBtn.style.height = "60px"
  adminBtn.style.display = "flex"
  adminBtn.style.alignItems = "center"
  adminBtn.style.justifyContent = "center"

  adminBtn.addEventListener("click", accessAdminPanel)

  document.body.appendChild(adminBtn)
}

// تصدير الدوال الجديدة
window.proceedWithDelete = proceedWithDelete
window.cancelDelete = cancelDelete
window.saveEditedStudent = saveEditedStudent

// تصدير الدوال للاستخدام في HTML
window.showConsent = showConsent
window.closeConsent = closeConsent
window.goToRegistration = goToRegistration
window.goToHome = goToHome
window.toggleSchoolField = toggleSchoolField
window.updateLocationOptions = updateLocationOptions
window.updateScheduleOptions = updateScheduleOptions
window.checkAndShowFoujNotice = checkAndShowFoujNotice
window.confirmFouj = confirmFouj
window.showFoujChangeModal = showFoujChangeModal
window.confirmPassword = confirmPassword
window.cancelPassword = cancelPassword
window.togglePasswordVisibility = togglePasswordVisibility
window.exportAllToExcel = exportAllToExcel
window.exportToJSON = exportToJSON
window.exportCurrentFoujToExcel = exportCurrentFoujToExcel
window.refreshData = refreshData
window.filterByFouj = filterByFouj
window.filterStudents = filterStudents
window.editStudent = editStudent
window.deleteStudent = deleteStudent
window.confirmDeleteStudent = confirmDeleteStudent
window.filterByFoujName = filterByFoujName
window.editToggleSchool = editToggleSchool
window.updateEditScheduleOptions = updateEditScheduleOptions
window.closeEditStudentModal = closeEditStudentModal
