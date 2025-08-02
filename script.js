// بيانات الطلاب المسجلين مع Firebase
let registeredStudents = [];
const MAX_STUDENTS_PER_FOUJ = 50;
let currentSelectedFouj = '';
let isFirebaseReady = false;
let pendingStudentData = null; // متغير مؤقت لبيانات الطالب

// تعريف أسماء الأفواج
const FOUJ_NAMES = {
    'رأس الوادي_يوم الجمعة صباحا الساعة 9:00': 'فوج رأس الوادي 9:00',
    'برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)': 'فوج البرج رياضيات+تقني 8:00',
    'برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)': 'فوج البرج علمي 10:30',
    'برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)': 'فوج البرج علمي 13:00'
};

// خيارات الأفواج للتغيير
const FOUJ_OPTIONS = [
    { key: 'رأس الوادي_يوم الجمعة صباحا الساعة 9:00', name: 'فوج رأس الوادي 9:00', location: 'رأس الوادي', schedule: 'يوم الجمعة صباحا الساعة 9:00' },
    { key: 'برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)', name: 'فوج البرج رياضيات+تقني 8:00', location: 'برج بوعريريج', schedule: 'يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)' },
    { key: 'برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)', name: 'فوج البرج علمي 10:30', location: 'برج بوعريريج', schedule: 'يوم السبت 10:30 صباحا (علوم تجريبية)' },
    { key: 'برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)', name:'فوج البرج علمي 13:00', location:'برج بوعريريج', schedule:'يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)'}
];

// ===== دوال Firebase =====

// تحديث حالة الاتصال
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (statusElement && statusText) {
        statusElement.style.display = 'flex';
        statusElement.className = 'connection-status ' + status;
        
        switch(status) {
            case 'connected':
                statusElement.style.background = '#27ae60';
                statusText.textContent = 'متصل';
                break;
            case 'offline':
                statusElement.style.background = '#e74c3c';
                statusText.textContent = 'غير متصل';
                break;
            case 'connecting':
                statusElement.style.background = '#f39c12';
                statusText.textContent = 'يتصل...';
                break;
        }
        
        // إخفاء حالة الاتصال بعد 5 ثواني إذا كان متصلاً
        if (status === 'connected') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

// تهيئة Firebase والتحقق من الاتصال
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && window.db) {
        isFirebaseReady = true;
        updateConnectionStatus('connected');
        console.log('✅ Firebase جاهز للاستخدام');
        
        // إخفاء إشعار قاعدة البيانات إذا كان ظاهراً
        const dbNotice = document.getElementById('dbStatusNotice');
        if (dbNotice) {
            dbNotice.style.display = 'none';
        }
        
        return true;
    } else {
        isFirebaseReady = false;
        updateConnectionStatus('offline');
        console.warn('⚠️ Firebase غير متاح - سيتم استخدام التخزين المحلي');
        
        // إظهار إشعار قاعدة البيانات
        const dbNotice = document.getElementById('dbStatusNotice');
        if (dbNotice) {
            dbNotice.style.display = 'flex';
        }
        
        return false;
    }
}

// حفظ طالب جديد في Firebase
async function saveStudentToFirebase(studentData) {
    if (!isFirebaseReady) {
        console.log('📱 Firebase غير متاح - حفظ محلي');
        // حفظ محلي
        studentData.id = Date.now() + Math.random();
        studentData.registrationDate = new Date().toLocaleDateString('ar-DZ');
        registeredStudents.unshift(studentData);
        localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
        return true;
    }
    
    try {
        updateConnectionStatus('connecting');
        
        const docRef = await db.collection('students').add({
            ...studentData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        
        // تحديث البيانات المحلية بالـ ID الجديد
        studentData.firebaseId = docRef.id;
        studentData.id = Date.now() + Math.random();
        studentData.registrationDate = new Date().toLocaleDateString('ar-DZ');
        registeredStudents.unshift(studentData);
        localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
        
        updateConnectionStatus('connected');
        console.log('✅ تم حفظ الطالب في Firebase:', docRef.id);
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
        updateConnectionStatus('offline');
        // حفظ محلي في حالة الفشل
        studentData.id = Date.now() + Math.random();
        studentData.registrationDate = new Date().toLocaleDateString('ar-DZ');
        registeredStudents.unshift(studentData);
        localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
        return true;
    }
}

// تحميل البيانات من Firebase
async function loadStudentsFromFirebase() {
    if (!isFirebaseReady) {
        console.log('📱 تحميل البيانات المحلية');
        registeredStudents = JSON.parse(localStorage.getItem('registeredStudents')) || [];
        return registeredStudents;
    }
    
    try {
        showLoadingIndicator(true);
        updateConnectionStatus('connecting');
        
        const snapshot = await db.collection('students')
            .orderBy('timestamp', 'desc')
            .get();
        
        const students = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            students.push({
                firebaseId: doc.id,
                id: data.id || Date.now() + Math.random(),
                ...data
            });
        });
        
        registeredStudents = students;
        
        // تحديث التخزين المحلي كنسخة احتياطية
        localStorage.setItem('registeredStudents', JSON.stringify(students));
        
        updateConnectionStatus('connected');
        console.log(`✅ تم تحميل ${students.length} طالب من Firebase`);
        
        return students;
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        updateConnectionStatus('offline');
        
        // في حالة الفشل، استخدم البيانات المحلية
        const localData = JSON.parse(localStorage.getItem('registeredStudents')) || [];
        registeredStudents = localData;
        return localData;
    } finally {
        showLoadingIndicator(false);
    }
}

// إظهار/إخفاء مؤشر التحميل
function showLoadingIndicator(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
    }
}

// دوال إدارة الأفواج
function getFoujName(location, schedule) {
    const key = `${location}_${schedule}`;
    return FOUJ_NAMES[key] || `فوج ${location}`;
}

function getFoujKey(location, schedule) {
    return `${location}_${schedule}`;
}

function checkFoujCapacity(location, schedule) {
    const foujKey = getFoujKey(location, schedule);
    const foujStudents = registeredStudents.filter(s => 
        s.location === location && s.schedule === schedule
    );
    return foujStudents.length;
}

// عرض لافتة جميلة بعرض كامل
function showAlert(message, type = 'success') {
    // إزالة أي لافتة موجودة
    const existingAlert = document.querySelector('.alert-success, .alert-danger');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-${type}`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '0';
    alertDiv.style.left = '0';
    alertDiv.style.width = '100%';
    alertDiv.style.padding = '20px';
    alertDiv.style.fontSize = '1.1rem';
    alertDiv.style.fontWeight = '600';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.display = 'flex';
    alertDiv.style.justifyContent = 'center';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.gap = '15px';
    alertDiv.style.color = 'white';
    alertDiv.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    
    if (type === 'success') {
        alertDiv.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)';
        alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
    } else {
        alertDiv.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${message}</span>`;
    }
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (alertDiv.parentNode) alertDiv.remove();
            }, 300);
        }
    }, 4000);
}

// ===== دوال واجهة المستخدم =====

function showConsent() {
    document.getElementById('consentModal').style.display = 'flex';
}

function closeConsent() {
    document.getElementById('consentModal').style.display = 'none';
}

function goToRegistration() {
    closeConsent();
    showPage('registrationPage');
}

function goToHome() {
    showPage('homePage');
}

function showPage(pageId) {
    console.log('تغيير الصفحة إلى:', pageId); // للتشخيص
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        console.log('تم عرض الصفحة:', pageId);
    } else {
        console.error('الصفحة غير موجودة:', pageId);
    }
}

// فحص سعة الفوج وإظهار إشعار إذا لزم الأمر
function checkAndShowFoujNotice() {
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const selectedSchedule = document.querySelector('input[name="schedule"]:checked');
    const notice = document.getElementById('foujFullNotice');
    const submitBtn = document.querySelector('.submit-btn');
    
    if (!selectedLocation || !selectedSchedule) {
        if (notice) notice.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
        return false;
    }
    
    const currentCount = checkFoujCapacity(selectedLocation.value, selectedSchedule.value);
    const foujName = getFoujName(selectedLocation.value, selectedSchedule.value);
    
    if (currentCount >= MAX_STUDENTS_PER_FOUJ) {
        if (notice) {
            notice.style.display = 'flex';
            notice.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>تنبيه: ${foujName} مكتمل (${MAX_STUDENTS_PER_FOUJ} طالب). لا يمكن التسجيل في هذا الفوج.</span>
            `;
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
        return false;
    } else {
        if (notice) notice.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        return true;
    }
}

// تبديل عرض حقل الثانوية
function toggleSchoolField(radio) {
    const schoolField = document.getElementById('schoolField');
    const schoolSelect = document.getElementById('school');
    if (radio.value === 'نظامي') {
        schoolField.style.display = 'block';
        schoolSelect.required = true;
    } else {
        schoolField.style.display = 'none';
        schoolSelect.required = false;
        schoolSelect.value = '';
    }
}

// تحديث خيارات التوقيت حسب المكان والشعبة
function updateLocationOptions(radio) {
    const scheduleOptions = document.getElementById('scheduleOptions');
    const scheduleChoices = document.getElementById('scheduleChoices');
    const mapContainer = document.getElementById('mapContainer');
    const mapFrame = document.getElementById('mapFrame');
    
    if (!radio.checked) {
        scheduleOptions.style.display = 'none';
        mapContainer.style.display = 'none';
        scheduleChoices.innerHTML = '';
        return;
    }
    
    scheduleOptions.style.display = 'block';
    mapContainer.style.display = 'block';
    
    if (radio.value === 'رأس الوادي') {
        scheduleChoices.innerHTML = `
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم الجمعة صباحا الساعة 9:00" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕘</span>
                يوم الجمعة صباحا الساعة 9:00
            </label>
        `;
        mapFrame.innerHTML = `
            <iframe src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d267.5754578298012!2d5.04348127440132!3d35.95112153179717!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sdz!4v1754072042503!5m2!1sen!2sdz" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        `;
    } else if (radio.value === 'برج بوعريريج') {
        updateScheduleOptions();
        mapFrame.innerHTML = `
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d267.1373246941547!2d4.779120692612777!3d36.080281128944634!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x128cbda0b49fb9f5%3A0x3b9a2f868e369a7f!2sProf%20Math.%20Belayadi%20Akram!5e1!3m2!1sen!2sdz!4v1754072246845!5m2!1sen!2sdz" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        `;
    }
}

// تحديث خيارات التوقيت حسب الشعبة لبرج بوعريريج
function updateScheduleOptions() {
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const selectedBranch = document.querySelector('input[name="branch"]:checked');
    const scheduleChoices = document.getElementById('scheduleChoices');
    
    if (!selectedLocation || selectedLocation.value !== 'برج بوعريريج' || !selectedBranch) {
        scheduleChoices.innerHTML = '';
        return;
    }
    
    let scheduleHTML = '';
    if (selectedBranch.value === 'رياضيات' || selectedBranch.value === 'تقني رياضي') {
        scheduleHTML = `
            <label class="radio-label">
                <input required type="radio" name="schedule" value="يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)" onchange="checkAndShowFoujNotice()">
                <span class="radio-icon">🕗</span>
                يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)
            </label>
        `;
    } else if (selectedBranch.value === 'علوم تجريبية') {
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
        `;
    }
    scheduleChoices.innerHTML = scheduleHTML;
}

// ===== دوال تأكيد وتغيير الفوج =====

// إذا وافق الطالب على الفوج
function confirmFouj() {
    document.getElementById('foujConfirmModal').style.display = 'none';
    finishStudentRegistration(pendingStudentData);
}

// إذا أراد التغيير
function showFoujChangeModal() {
    document.getElementById('foujConfirmModal').style.display = 'none';
    populateFoujChoices();
    document.getElementById('foujChangeModal').style.display = 'flex';
}

// تعبئة خيارات الأفواج
function populateFoujChoices() {
    const foujChoices = document.getElementById('foujChoicesList');
    foujChoices.innerHTML = '';
    FOUJ_OPTIONS.forEach(opt => {
        foujChoices.innerHTML += `
            <label class="radio-label">
                <input required type="radio" name="chosenFouj" value="${opt.key}">
                ${opt.name} (${opt.schedule})
            </label>
        `;
    });
}

// دالة إنهاء التسجيل
async function finishStudentRegistration(studentData) {
    showLoadingIndicator(true);
    
    const success = await saveStudentToFirebase(studentData);
    
    showLoadingIndicator(false);
    
    if (success) {
        showPage('confirmationPage');
        showAlert('تم التسجيل بنجاح!', 'success');
        
        // تصفير النموذج
        const form = document.getElementById('registrationForm');
        if (form) form.reset();
        
        // إخفاء حقل الثانوية
        const schoolField = document.getElementById('schoolField');
        if (schoolField) schoolField.style.display = 'none';
        
        // إخفاء خيارات التوقيت والخريطة
        const scheduleOptions = document.getElementById('scheduleOptions');
        const mapContainer = document.getElementById('mapContainer');
        if (scheduleOptions) scheduleOptions.style.display = 'none';
        if (mapContainer) mapContainer.style.display = 'none';
        
        // تحديث الإحصائيات إذا كانت لوحة التحكم مفتوحة
        if (document.getElementById('adminPanel').classList.contains('active')) {
            displayFoujStats();
            displayStudentsTable();
        }
    } else {
        showAlert('حدث خطأ أثناء التسجيل. حاول مرة أخرى.', 'danger');
    }
}

// ===== معالجة إرسال النموذج =====

// معالجة إرسال النموذج الأصلي مع تأكيد الفوج
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // جمع بيانات النموذج
            const formData = new FormData(this);
            
            const studentData = {
                studentType: formData.get('studentType'),
                school: formData.get('school') || 'غير محدد',
                fullName: formData.get('fullName'),
                birthDate: formData.get('birthDate'),
                branch: formData.get('branch'),
                averageGrade: formData.get('averageGrade'),
                mathLevel: formData.get('mathLevel'),
                personalPhone: formData.get('personalPhone'),
                guardianPhone: formData.get('guardianPhone'),
                location: formData.get('location'),
                schedule: formData.get('schedule')
            };
            
            // التحقق من اكتمال البيانات المطلوبة
            if (!studentData.studentType || !studentData.location || !studentData.schedule) {
                showAlert('يرجى ملء جميع الحقول المطلوبة.', 'danger');
                return;
            }
            
            // فحص سعة الفوج
            if (!checkAndShowFoujNotice()) {
                showAlert('عذراً، هذا الفوج مكتمل. يرجى اختيار فوج آخر.', 'danger');
                return;
            }
            
            // حفظ البيانات مؤقتاً
            pendingStudentData = studentData;
            
            // اسم الفوج للاستعراض
            const foujName = getFoujName(studentData.location, studentData.schedule);
            document.getElementById('selectedFoujName').textContent = foujName;
            
            // عرض لافتة التأكيد
            document.getElementById('foujConfirmModal').style.display = 'flex';
        });
    }
    
    // معالجة تغيير الفوج
    const changeFoujForm = document.getElementById('changeFoujForm');
    if (changeFoujForm) {
        changeFoujForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const chosenFoujKey = document.querySelector('input[name="chosenFouj"]:checked');
            if (!chosenFoujKey) {
                showAlert('الرجاء اختيار فوج جديد.', 'danger');
                return;
            }
            
            const fouj = FOUJ_OPTIONS.find(f => f.key === chosenFoujKey.value);
            if (fouj) {
                // تعديل بيانات الفوج في المتغير
                pendingStudentData.location = fouj.location;
                pendingStudentData.schedule = fouj.schedule;
                
                document.getElementById('foujChangeModal').style.display = 'none';
                
                // إكمال التسجيل بالفوج الجديد
                finishStudentRegistration(pendingStudentData);
            }
        });
    }
});

// دوال الإدارة الأساسية (يمكنك توسيعها)
function displayFoujStats() {
    // مكان لعرض إحصائيات الأفواج
    console.log('عرض إحصائيات الأفواج');
}

function displayStudentsTable() {
    // مكان لعرض جدول الطلاب
    console.log('عرض جدول الطلاب');
}

function exportAllToExcel() {
    console.log('تصدير Excel');
}

function exportToJSON() {
    console.log('تصدير JSON');
}

function exportCurrentFoujToExcel() {
    console.log('تصدير الفوج الحالي');
}

function refreshData() {
    loadStudentsFromFirebase();
}

function filterByFouj() {
    console.log('فلترة بالفوج');
}

function filterStudents() {
    console.log('فلترة الطلاب');
}

// دوال لوحة التحكم
function accessAdminPanel() {
    showPasswordModal();
}

function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.style.display = 'flex';
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 100);
        }
    }
}

function confirmPassword() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput ? passwordInput.value : '';
    
    if (password === 'admin123') {
        cancelPassword();
        showPage('adminPanel');
        loadStudentsFromFirebase().then(() => {
            displayFoujStats();
            displayStudentsTable();
        });
    } else if (password.trim() === '') {
        showAlert('يرجى إدخال كلمة المرور', 'danger');
        if (passwordInput) passwordInput.focus();
    } else {
        showAlert('كلمة مرور خاطئة', 'danger');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

function cancelPassword() {
    const modal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('adminPassword');
    if (modal) modal.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('adminPassword');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تحميل التطبيق...');
    
    // تهيئة Firebase
    initializeFirebase();
    
    // تحميل البيانات
    loadStudentsFromFirebase();
    
    // إنشاء زر لوحة التحكم
    createAdminButton();
});

// إنشاء زر لوحة التحكم
function createAdminButton() {
    // التحقق من وجود زر سابق وإزالته
    const existingButton = document.querySelector('.admin-control-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    const adminBtn = document.createElement('button');
    adminBtn.className = 'admin-control-button';
    adminBtn.innerHTML = '<i class="fas fa-cogs"></i>';
    adminBtn.title = 'لوحة التحكم الإدارية';
    adminBtn.style.position = 'fixed';
    adminBtn.style.top = '20px';
    adminBtn.style.right = '20px';
    adminBtn.style.zIndex = '9999';
    adminBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    adminBtn.style.color = '#000000';
    adminBtn.style.border = '3px solid #000000';
    adminBtn.style.padding = '15px';
    adminBtn.style.fontSize = '24px';
    adminBtn.style.cursor = 'pointer';
    adminBtn.style.borderRadius = '50%';
    adminBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
    adminBtn.style.transition = 'all 0.3s ease';
    adminBtn.style.width = '60px';
    adminBtn.style.height = '60px';
    adminBtn.style.display = 'flex';
    adminBtn.style.alignItems = 'center';
    adminBtn.style.justifyContent = 'center';
    
    adminBtn.addEventListener('click', accessAdminPanel);
    
    document.body.appendChild(adminBtn);
}

// تصدير الدوال للاستخدام في HTML
window.showConsent = showConsent;
window.closeConsent = closeConsent;
window.goToRegistration = goToRegistration;
window.goToHome = goToHome;
window.toggleSchoolField = toggleSchoolField;
window.updateLocationOptions = updateLocationOptions;
window.updateScheduleOptions = updateScheduleOptions;
window.checkAndShowFoujNotice = checkAndShowFoujNotice;
window.confirmFouj = confirmFouj;
window.showFoujChangeModal = showFoujChangeModal;
window.confirmPassword = confirmPassword;
window.cancelPassword = cancelPassword;
window.togglePasswordVisibility = togglePasswordVisibility;
window.exportAllToExcel = exportAllToExcel;
window.exportToJSON = exportToJSON;
window.exportCurrentFoujToExcel = exportCurrentFoujToExcel;
window.refreshData = refreshData;
window.filterByFouj = filterByFouj;
window.filterStudents = filterStudents;
