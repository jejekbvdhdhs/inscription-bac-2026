// بيانات الطلاب المسجلين مع Firebase
let registeredStudents = [];
const MAX_STUDENTS_PER_FOUJ = 50;
let currentSelectedFouj = '';
let isFirebaseReady = false;

// تعريف أسماء الأفواج
const FOUJ_NAMES = {
    'رأس الوادي_يوم الجمعة صباحا الساعة 9:00': 'فوج رأس الوادي 9:00',
    'برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)': 'فوج البرج رياضيات+تقني 8:00',
    'برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)': 'فوج البرج علمي 10:30',
    'برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)': 'فوج البرج علمي 13:00'
};

// خيارات الأفواج للتغيير
const FOUJ_OPTIONS = [
    { 
        key: 'رأس الوادي_يوم الجمعة صباحا الساعة 9:00', 
        name: 'فوج رأس الوادي 9:00', 
        location: 'رأس الوادي', 
        schedule: 'يوم الجمعة صباحا الساعة 9:00' 
    },
    { 
        key: 'برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)', 
        name: 'فوج البرج رياضيات+تقني 8:00', 
        location: 'برج بوعريريج', 
        schedule: 'يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)' 
    },
    { 
        key: 'برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)', 
        name: 'فوج البرج علمي 10:30', 
        location: 'برج بوعريريج', 
        schedule: 'يوم السبت 10:30 صباحا (علوم تجريبية)' 
    },
    { 
        key: 'برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)', 
        name: 'فوج البرج علمي 13:00', 
        location: 'برج بوعريريج', 
        schedule: 'يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)' 
    }
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
        return false;
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
        
        updateConnectionStatus('connected');
        console.log('✅ تم حفظ الطالب في Firebase:', docRef.id);
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
        updateConnectionStatus('offline');
        return false;
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

// حذف طالب من Firebase
async function deleteStudentFromFirebase(student) {
    if (!isFirebaseReady || !student.firebaseId) {
        console.log('📱 Firebase غير متاح أو لا يوجد ID - حذف محلي فقط');
        return false;
    }
    
    try {
        updateConnectionStatus('connecting');
        await db.collection('students').doc(student.firebaseId).delete();
        updateConnectionStatus('connected');
        console.log('✅ تم حذف الطالب من Firebase');
        return true;
    } catch (error) {
        console.error('❌ خطأ في حذف البيانات:', error);
        updateConnectionStatus('offline');
        return false;
    }
}

// تحديث بيانات طالب في Firebase
async function updateStudentInFirebase(student, updates) {
    if (!isFirebaseReady || !student.firebaseId) {
        console.log('📱 Firebase غير متاح أو لا يوجد ID - تحديث محلي فقط');
        return false;
    }
    
    try {
        updateConnectionStatus('connecting');
        await db.collection('students').doc(student.firebaseId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateConnectionStatus('connected');
        console.log('✅ تم تحديث الطالب في Firebase');
        return true;
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات:', error);
        updateConnectionStatus('offline');
        return false;
    }
}

// تحديث البيانات يدوياً
async function refreshData() {
    console.log('🔄 تحديث البيانات...');
    await loadStudentsFromFirebase();
    
    // تحديث العرض إذا كنا في لوحة التحكم
    if (document.getElementById('adminPanel').classList.contains('active')) {
        displayFoujStats();
        displayStudentsTable();
        showAlert('🔄 تم تحديث البيانات بنجاح!', 'success');
    }
}

// ===== دوال أساسية =====

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

function getFoujStats() {
    const stats = {};
    
    // إضافة جميع الأفواج حتى الفارغة
    FOUJ_OPTIONS.forEach(option => {
        stats[option.key] = {
            name: option.name,
            count: 0,
            students: [],
            location: option.location,
            schedule: option.schedule
        };
    });
    
    // ملء البيانات الحقيقية
    registeredStudents.forEach(student => {
        const foujKey = student.foujKey || getFoujKey(student.location, student.schedule);
        
        if (stats[foujKey]) {
            stats[foujKey].count++;
            stats[foujKey].students.push(student);
        }
    });
    
    return stats;
}

function updateStudentsFoujInfo() {
    // تحديث معلومات الفوج لجميع الطلاب
    registeredStudents.forEach(student => {
        if (student.location && student.schedule) {
            student.foujKey = getFoujKey(student.location, student.schedule);
            student.foujName = getFoujName(student.location, student.schedule);
        }
    });
    localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
}

function checkFoujCapacity(location, schedule) {
    const foujKey = getFoujKey(location, schedule);
    const foujStudents = registeredStudents.filter(s => s.foujKey === foujKey);
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
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                alertDiv.remove();
            }, 300);
        }
    }, 4000);
}

// ===== دوال واجهة المستخدم =====

function showConsent() {
    document.getElementById('consentModal').style.display = 'block';
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
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// فحص سعة الفوج وإظهار إشعار إذا لزم الأمر
function checkAndShowFoujNotice() {
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const selectedSchedule = document.querySelector('input[name="schedule"]:checked');
    const notice = document.getElementById('foujFullNotice');
    
    if (selectedLocation && selectedSchedule) {
        const currentCount = checkFoujCapacity(selectedLocation.value, selectedSchedule.value);
        const foujName = getFoujName(selectedLocation.value, selectedSchedule.value);
        
        if (currentCount >= MAX_STUDENTS_PER_FOUJ) {
            notice.style.display = 'flex';
            notice.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>تنبيه: ${foujName} مكتمل (${MAX_STUDENTS_PER_FOUJ} طالب). لا يمكن التسجيل في هذا الفوج.</span>
            `;
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
            }
            return false;
        } else {
            notice.style.display = 'none';
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            return true;
        }
    }
    return true;
}

// تبديل عرض حقل الثانوية
function toggleSchoolField(radio) {
    const schoolField = document.getElementById('schoolField');
    if (radio.value === 'نظامي') {
        schoolField.style.display = 'block';
        document.getElementById('school').required = true;
    } else {
        schoolField.style.display = 'none';
        document.getElementById('school').required = false;
        document.getElementById('school').value = '';
    }
}

// تحديث خيارات التوقيت حسب المكان والشعبة
function updateLocationOptions(radio) {
    const scheduleOptions = document.getElementById('scheduleOptions');
    const scheduleChoices = document.getElementById('scheduleChoices');
    const mapContainer = document.getElementById('mapContainer');
    const mapFrame = document.getElementById('mapFrame');
    
    if (radio.checked) {
        scheduleOptions.style.display = 'block';
        mapContainer.style.display = 'block';
        
        if (radio.value === 'رأس الوادي') {
            scheduleChoices.innerHTML = `
                <label class="radio-label">
                    <input type="radio" name="schedule" value="يوم الجمعة صباحا الساعة 9:00" onchange="checkAndShowFoujNotice()">
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
    } else {
        scheduleOptions.style.display = 'none';
        mapContainer.style.display = 'none';
        const notice = document.getElementById('foujFullNotice');
        if (notice) notice.style.display = 'none';
    }
}

// تحديث خيارات التوقيت حسب الشعبة لبرج بوعريريج
function updateScheduleOptions() {
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const selectedBranch = document.querySelector('input[name="branch"]:checked');
    const scheduleChoices = document.getElementById('scheduleChoices');
    
    if (selectedLocation && selectedLocation.value === 'برج بوعريريج' && selectedBranch) {
        let scheduleHTML = '';
        
        if (selectedBranch.value === 'رياضيات' || selectedBranch.value === 'تقني رياضي') {
            scheduleHTML = `
                <label class="radio-label">
                    <input type="radio" name="schedule" value="يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)" onchange="checkAndShowFoujNotice()">
                    <span class="radio-icon">🕗</span>
                    يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)
                </label>
            `;
        } else if (selectedBranch.value === 'علوم تجريبية') {
            scheduleHTML = `
                <label class="radio-label">
                    <input type="radio" name="schedule" value="يوم السبت 10:30 صباحا (علوم تجريبية)" onchange="checkAndShowFoujNotice()">
                    <span class="radio-icon">🕥</span>
                    يوم السبت 10:30 صباحا (علوم تجريبية)
                </label>
                <label class="radio-label">
                    <input type="radio" name="schedule" value="يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)" onchange="checkAndShowFoujNotice()">
                    <span class="radio-icon">🕐</span>
                    يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)
                </label>
            `;
        }
        
        scheduleChoices.innerHTML = scheduleHTML;
    }
}

// ===== دوال الحذف والتعديل =====

// نافذة تأكيد الحذف المحسنة
function showDeleteConfirmation(student) {
    const modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="delete-confirmation-content">
            <div class="delete-header">
                <i class="fas fa-trash-alt"></i>
                <h3>تأكيد حذف الطالب</h3>
            </div>
            <div class="delete-body">
                <p>هل أنت متأكد من حذف هذا الطالب نهائياً؟</p>
                
                <div class="student-info">
                    <h4>📋 بيانات الطالب:</h4>
                    <p><strong>الاسم:</strong> ${student.fullName}</p>
                    <p><strong>الفوج:</strong> ${student.foujName}</p>
                    <p><strong>الشعبة:</strong> ${student.branch}</p>
                    <p><strong>الثانوية:</strong> ${student.school}</p>
                </div>
                
                <div class="delete-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه!
                </div>
                
                <div class="delete-buttons">
                    <button class="btn-confirm-delete" onclick="confirmStudentDeletion(${student.id})">
                        <i class="fas fa-trash"></i>
                        نعم، احذف نهائياً
                    </button>
                    <button class="btn-cancel-delete" onclick="cancelStudentDeletion()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function cancelStudentDeletion() {
    const modal = document.querySelector('.delete-confirmation-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// تأكيد حذف الطالب مع Firebase
async function confirmStudentDeletion(id) {
    const studentIndex = registeredStudents.findIndex(s => s.id == id);
    if (studentIndex === -1) {
        showAlert('الطالب غير موجود', 'danger');
        cancelStudentDeletion();
        return;
    }
    
    const student = registeredStudents[studentIndex];
    const studentName = student.fullName;
    const foujName = student.foujName;
    
    // محاولة حذف من Firebase
    const deletedFromFirebase = await deleteStudentFromFirebase(student);
    
    // حذف من المصفوفة المحلية
    registeredStudents.splice(studentIndex, 1);
    localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
    
    // تحديث العرض
    displayFoujStats();
    displayStudentsTable();
    
    cancelStudentDeletion();
    
    if (deletedFromFirebase) {
        showAlert(`🗑️ تم حذف الطالب "${studentName}" من ${foujName} نهائياً من جميع الأجهزة`, 'success');
    } else {
        showAlert(`🗑️ تم حذف الطالب "${studentName}" من ${foujName} محلياً`, 'warning');
    }
}

function deleteStudent(id) {
    const student = registeredStudents.find(s => s.id == id);
    if (!student) {
        showAlert('الطالب غير موجود', 'danger');
        return;
    }
    
    showDeleteConfirmation(student);
}

// تغيير فوج الطالب
function changeStudentFouj(id) {
    const student = registeredStudents.find(s => s.id == id);
    if (!student) {
        showAlert('الطالب غير موجود', 'danger');
        return;
    }
    
    const modal = createFoujChangeModal(student);
    document.body.appendChild(modal);
}

function createFoujChangeModal(student) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let optionsHTML = '';
    FOUJ_OPTIONS.forEach(option => {
        const count = registeredStudents.filter(s => s.foujKey === option.key).length;
        const isCurrentFouj = student.foujKey === option.key;
        const isFull = count >= MAX_STUDENTS_PER_FOUJ && !isCurrentFouj;
        const disabled = isFull ? 'disabled' : '';
        const statusText = isFull ? '(مكتمل)' : `(${count}/${MAX_STUDENTS_PER_FOUJ})`;
        const currentText = isCurrentFouj ? ' (الفوج الحالي)' : '';
        
        optionsHTML += `
            <label class="radio-label ${disabled}" style="margin-bottom: 10px; ${isFull ? 'opacity: 0.5;' : ''} ${isCurrentFouj ? 'background-color: #e3f2fd; border-color: #2196f3;' : ''}">
                <input type="radio" name="newFouj" value="${option.key}" ${disabled} ${isCurrentFouj ? 'checked' : ''}>
                <span>${option.name} ${statusText}${currentText}</span>
            </label>
        `;
    });
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-exchange-alt" style="font-size: 3rem; color: #3498db; margin-bottom: 15px;"></i>
                <h3>تغيير فوج الطالب: ${student.fullName}</h3>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <p><strong>الفوج الحالي:</strong> ${student.foujName}</p>
            </div>
            <div style="margin: 20px 0;">
                <label style="font-weight: bold; margin-bottom: 15px; display: block;">اختر الفوج الجديد:</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${optionsHTML}
                </div>
            </div>
            <div class="consent-buttons">
                <button class="btn-yes" onclick="confirmFoujChange('${student.id}')" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
                    <i class="fas fa-check"></i> تأكيد التغيير
                </button>
                <button class="btn-no" onclick="closeFoujChangeModal()">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

// تأكيد تغيير الفوج مع Firebase
async function confirmFoujChange(studentId) {
    const modal = document.querySelector('.modal');
    const selectedFouj = modal.querySelector('input[name="newFouj"]:checked');
    
    if (!selectedFouj) {
        showAlert('يرجى اختيار فوج جديد', 'danger');
        return;
    }
    
    const student = registeredStudents.find(s => s.id == studentId);
    if (!student) {
        showAlert('الطالب غير موجود', 'danger');
        return;
    }
    
    const newFoujData = FOUJ_OPTIONS.find(option => option.key === selectedFouj.value);
    
    if (!newFoujData) {
        showAlert('بيانات الفوج غير صحيحة', 'danger');
        return;
    }
    
    if (student.foujKey === selectedFouj.value) {
        showAlert('الطالب موجود بالفعل في هذا الفوج', 'danger');
        return;
    }
    
    const oldFoujName = student.foujName;
    
    // تحديث بيانات الطالب
    const updates = {
        location: newFoujData.location,
        schedule: newFoujData.schedule,
        foujKey: newFoujData.key,
        foujName: newFoujData.name
    };
    
    Object.assign(student, updates);
    
    // محاولة تحديث في Firebase
    const updatedInFirebase = await updateStudentInFirebase(student, updates);
    
    // حفظ البيانات المحدثة محلياً
    localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
    
    // تحديث العرض
    displayFoujStats();
    displayStudentsTable();
    
    closeFoujChangeModal();
    
    if (updatedInFirebase) {
        showAlert(`🔄 تم تغيير فوج الطالب "${student.fullName}" من "${oldFoujName}" إلى "${student.foujName}" في جميع الأجهزة`, 'success');
    } else {
        showAlert(`🔄 تم تغيير فوج الطالب "${student.fullName}" من "${oldFoujName}" إلى "${student.foujName}" محلياً`, 'warning');
    }
}

function closeFoujChangeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// ===== دوال الفلترة والعرض =====

function filterByFoujCard(foujKey) {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const selectedCard = document.querySelector(`[data-fouj-key="${foujKey}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    
    const foujFilter = document.getElementById('foujFilter');
    if (foujFilter) {
        foujFilter.value = foujKey;
    }
    
    currentSelectedFouj = foujKey;
    displayStudentsTable('', '', foujKey);
}

function clearFoujFilter() {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const foujFilter = document.getElementById('foujFilter');
    if (foujFilter) {
        foujFilter.value = '';
    }
    
    currentSelectedFouj = '';
    displayStudentsTable();
}

function filterByFouj() {
    const foujFilter = document.getElementById('foujFilter').value;
    const branchFilter = document.getElementById('branchFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;
    
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active');
    });
    
    if (foujFilter) {
        const selectedCard = document.querySelector(`[data-fouj-key="${foujFilter}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }
    
    currentSelectedFouj = foujFilter;
    displayStudentsTable(branchFilter, locationFilter, foujFilter);
}

function filterStudents() {
    const branchFilter = document.getElementById('branchFilter');
    const locationFilter = document.getElementById('locationFilter');
    const foujFilter = document.getElementById('foujFilter');
    
    if (branchFilter && locationFilter && foujFilter) {
        displayStudentsTable(branchFilter.value, locationFilter.value, foujFilter.value);
    }
}

// عرض جدول الطلاب
function displayStudentsTable(branchFilter = '', locationFilter = '', foujFilter = '') {
    const tbody = document.getElementById('studentsTableBody');
    const titleElement = document.getElementById('currentFoujTitle');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filteredStudents = registeredStudents.filter(student => {
        const branchMatch = !branchFilter || student.branch === branchFilter;
        const locationMatch = !locationFilter || student.location === locationFilter;
        const foujMatch = !foujFilter || student.foujKey === foujFilter;
        return branchMatch && locationMatch && foujMatch;
    });
    
    if (titleElement) {
        if (foujFilter) {
            const foujStats = getFoujStats();
            const fouj = foujStats[foujFilter];
            const foujName = fouj ? fouj.name : 'فوج غير معروف';
            titleElement.textContent = `${foujName} (${filteredStudents.length} طالب)`;
        } else {
            titleElement.textContent = `جميع الطلاب المسجلين (${filteredStudents.length} طالب)`;
        }
    }
    
    filteredStudents.forEach((student, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${student.foujName || 'غير محدد'}</strong></td>
            <td>${student.fullName}</td>
            <td>${student.studentType}</td>
            <td>${student.school}</td>
            <td>${student.branch}</td>
            <td>${student.averageGrade}</td>
            <td>${student.mathLevel}</td>
            <td>${student.personalPhone}</td>
            <td>${student.guardianPhone}</td>
            <td>${student.location}</td>
            <td>${student.schedule}</td>
            <td>${student.registrationDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="changeStudentFouj(${student.id})" title="تغيير الفوج">
                        <i class="fas fa-edit"></i>
                        تغيير
                    </button>
                    <button class="btn-delete" onclick="deleteStudent(${student.id})" title="حذف الطالب">
                        <i class="fas fa-trash"></i>
                        حذف
                    </button>
                </div>
            </td>
        `;
    });
}

// عرض إحصائيات الأفواج
function displayFoujStats() {
    const statsContainer = document.getElementById('foujStatsContainer');
    const foujFilter = document.getElementById('foujFilter');
    
    if (!statsContainer || !foujFilter) return;
    
    updateStudentsFoujInfo();
    
    const foujStats = getFoujStats();
    const totalFoujs = Object.keys(foujStats).length;
    
    statsContainer.innerHTML = '';
    foujFilter.innerHTML = '<option value="">جميع الأفواج</option>';
    
    // عرض إحصائية عامة
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-card clickable';
    totalCard.setAttribute('data-fouj-key', '');
    totalCard.onclick = () => clearFoujFilter();
    totalCard.innerHTML = `
        <h4>إجمالي الطلاب</h4>
        <div class="stat-number">${registeredStudents.length}</div>
        <div>في ${totalFoujs} فوج</div>
    `;
    statsContainer.appendChild(totalCard);
    
    // ترتيب الأفواج
    const foujOrder = [
        'رأس الوادي_يوم الجمعة صباحا الساعة 9:00',
        'برج بوعريريج_يوم السبت 8:00 صباحا (رياضيات + تقني رياضي)',
        'برج بوعريريج_يوم السبت 10:30 صباحا (علوم تجريبية)',
        'برج بوعريريج_يوم السبت فوج الساعة الواحدة مساء (علوم تجريبية)'
    ];
    
    foujOrder.forEach(foujKey => {
        const fouj = foujStats[foujKey];
        if (fouj) {
            const percentage = (fouj.count / MAX_STUDENTS_PER_FOUJ) * 100;
            const isFull = fouj.count >= MAX_STUDENTS_PER_FOUJ;
            const isEmpty = fouj.count === 0;
            
            const card = document.createElement('div');
            card.className = `stat-card clickable ${isEmpty ? 'empty' : ''}`;
            card.setAttribute('data-fouj-key', foujKey);
            card.onclick = () => filterByFoujCard(foujKey);
            
            card.innerHTML = `
                <h4>${fouj.name}</h4>
                <div class="stat-number">${fouj.count}/${MAX_STUDENTS_PER_FOUJ}</div>
                <div class="capacity-bar">
                    <div class="capacity-fill ${isFull ? 'capacity-full' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div style="margin-top: 5px; font-size: 0.9rem;">
                    ${isFull ? 'مكتمل' : isEmpty ? 'فارغ' : `متبقي ${MAX_STUDENTS_PER_FOUJ - fouj.count}`}
                </div>
            `;
            
            if (currentSelectedFouj === foujKey) {
                card.classList.add('active');
            }
            
            statsContainer.appendChild(card);
            
            const option = document.createElement('option');
            option.value = foujKey;
            option.textContent = `${fouj.name} (${fouj.count}/${MAX_STUDENTS_PER_FOUJ})`;
            if (currentSelectedFouj === foujKey) {
                option.selected = true;
            }
            foujFilter.appendChild(option);
        }
    });
}

// ===== دوال التصدير =====

function exportAllToExcel() {
    if (registeredStudents.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    const foujStats = getFoujStats();
    const activeFoujs = Object.keys(foujStats).filter(key => foujStats[key].count > 0);
    
    if (confirm(`سيتم إنشاء ${activeFoujs.length} ملف Excel منفصل لكل فوج. هل تريد المتابعة؟`)) {
        activeFoujs.forEach(foujKey => {
            const fouj = foujStats[foujKey];
            exportFoujToExcel(fouj.name, fouj.students);
        });
        
        alert(`تم تصدير ملفات Excel بنجاح!`);
    }
}

function exportFoujToExcel(foujName, students) {
    let htmlTable = `
        <table border="1" style="border-collapse: collapse;">
            <thead>
                <tr style="background-color: #000000; color: white;">
                    <th style="padding: 10px;">الرقم</th>
                    <th style="padding: 10px;">الاسم واللقب</th>
                    <th style="padding: 10px;">نوع الطالب</th>
                    <th style="padding: 10px;">الثانوية</th>
                    <th style="padding: 10px;">تاريخ الميلاد</th>
                    <th style="padding: 10px;">الشعبة</th>
                    <th style="padding: 10px;">المعدل</th>
                    <th style="padding: 10px;">مستوى الرياضيات</th>
                    <th style="padding: 10px;">الهاتف الشخصي</th>
                    <th style="padding: 10px;">هاتف الولي</th>
                    <th style="padding: 10px;">تاريخ التسجيل</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    students.forEach((student, index) => {
        htmlTable += `
            <tr ${index % 2 === 0 ? 'style="background-color: #f8f9fa;"' : ''}>
                <td style="padding: 8px; text-align: center;">${index + 1}</td>
                <td style="padding: 8px;">${student.fullName}</td>
                <td style="padding: 8px; text-align: center;">${student.studentType}</td>
                <td style="padding: 8px;">${student.school}</td>
                <td style="padding: 8px; text-align: center;">${student.birthDate}</td>
                <td style="padding: 8px; text-align: center;">${student.branch}</td>
                <td style="padding: 8px; text-align: center;">${student.averageGrade}</td>
                <td style="padding: 8px; text-align: center;">${student.mathLevel}</td>
                <td style="padding: 8px; text-align: center;">${student.personalPhone}</td>
                <td style="padding: 8px; text-align: center;">${student.guardianPhone}</td>
                <td style="padding: 8px; text-align: center;">${student.registrationDate}</td>
            </tr>
        `;
    });
    
    htmlTable += '</tbody></table>';
    
    const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <meta name="ProgId" content="Excel.Sheet">
            <meta name="Generator" content="Microsoft Excel 15">
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 8px; text-align: right; }
                th { background-color: #000000; color: white; font-weight: bold; }
                tr:nth-child(even) { background-color: #f8f9fa; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center; color: #000000; margin-bottom: 20px;">
                ${foujName} - دروس الدعم في الرياضيات - بكالوريا 2026
            </h2>
            <p style="text-align: center; color: #333333; margin-bottom: 30px;">
                الأستاذ بلعياضي أكرم | عدد الطلاب: ${students.length} | تاريخ التصدير: ${new Date().toLocaleDateString('ar-DZ')}
            </p>
            ${htmlTable}
        </body>
        </html>
    `;
    
    const blob = new Blob(['\ufeff', excelContent], {
        type: 'application/vnd.ms-excel;charset=utf-8'
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${foujName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportCurrentFoujToExcel() {
    const foujFilter = document.getElementById('foujFilter');
    const selectedFouj = foujFilter ? foujFilter.value : '';
    
    if (selectedFouj) {
        const foujStats = getFoujStats();
        const fouj = foujStats[selectedFouj];
        if (fouj && fouj.count > 0) {
            exportFoujToExcel(fouj.name, fouj.students);
            alert(`تم تصدير ${fouj.name} بنجاح!`);
        } else {
            alert('هذا الفوج فارغ، لا توجد بيانات للتصدير');
        }
    } else {
        if (registeredStudents.length > 0) {
            exportFoujToExcel('جميع_الطلاب', registeredStudents);
            alert('تم تصدير جميع الطلاب بنجاح!');
        } else {
            alert('لا توجد بيانات للتصدير');
        }
    }
}

function exportToJSON() {
    if (registeredStudents.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    const foujStats = getFoujStats();
    const jsonData = {
        exportDate: new Date().toISOString(),
        totalStudents: registeredStudents.length,
        totalFoujs: Object.keys(foujStats).length,
        foujStats: foujStats,
        students: registeredStudents,
        firebaseStatus: isFirebaseReady ? 'connected' : 'offline'
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json;charset=utf-8'
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `backup_students_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('تم إنشاء النسخة الاحتياطية بنجاح!');
}

// ===== دوال لوحة التحكم =====

function accessAdminPanel() {
    showPasswordModal();
}

function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    modal.style.display = 'block';
    
    setTimeout(() => {
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 100);
    
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmPassword();
            }
        });
    }
}

async function confirmPassword() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput.value;
    
    if (password === 'admin123') {
        cancelPassword();
        showPage('adminPanel');
        
        // تحميل البيانات من Firebase إذا لم تكن محملة
        if (registeredStudents.length === 0) {
            await loadStudentsFromFirebase();
        }
        
        displayFoujStats();
        displayStudentsTable();
    } else if (password.trim() === '') {
        alert('يرجى إدخال كلمة المرور');
        passwordInput.focus();
    } else {
        alert('كلمة مرور خاطئة');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function cancelPassword() {
    const modal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('adminPassword');
    
    modal.style.display = 'none';
    passwordInput.value = '';
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('adminPassword');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// إنشاء زر لوحة التحكم
function createAdminButton() {
    const existingButton = document.querySelector('.admin-control-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    const adminBtn = document.createElement('button');
    adminBtn.className = 'admin-control-button';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i>';
    adminBtn.title = 'لوحة التحكم الإدارية';
    
    adminBtn.addEventListener('mouseover', function() {
        this.style.color = '#ffffff';
        this.style.backgroundColor = '#000000';
        this.style.transform = 'rotate(90deg) scale(1.1)';
        this.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4)';
    });
    
    adminBtn.addEventListener('mouseout', function() {
        this.style.color = '#000000';
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        this.style.transform = 'rotate(0deg) scale(1)';
        this.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
    });
    
    adminBtn.addEventListener('click', accessAdminPanel);
    
    document.body.appendChild(adminBtn);
    
    // حركة دوران خفيفة
    setInterval(function() {
        if (!adminBtn.matches(':hover')) {
            adminBtn.style.transform = 'rotate(5deg)';
            setTimeout(function() {
                if (adminBtn && document.contains(adminBtn)) {
                    adminBtn.style.transform = 'rotate(-5deg)';
                    setTimeout(function() {
                        if (adminBtn && document.contains(adminBtn)) {
                            adminBtn.style.transform = 'rotate(0deg)';
                        }
                    }, 300);
                }
            }, 300);
        }
    }, 4000);
    
    return adminBtn;
}

// إضافة رموز رياضياتية إضافية
function addMoreMathSymbols() {
    const mathContainers = document.querySelectorAll('.math-symbols');
    const additionalSymbols = ['∮', '∯', '∰', '∱', '∲', '∳', '⊕', '⊗', '⊙', '⊘'];
    
    mathContainers.forEach(mathContainer => {
        additionalSymbols.forEach((symbol, index) => {
            const symbolDiv = document.createElement('div');
            symbolDiv.className = 'symbol';
            symbolDiv.textContent = symbol;
            symbolDiv.style.top = Math.random() * 80 + '%';
            symbolDiv.style.left = Math.random() * 80 + '%';
            symbolDiv.style.animationDelay = (index * 3) + 's';
            symbolDiv.style.fontSize = (Math.random() * 1.5 + 2.5) + 'rem';
            mathContainer.appendChild(symbolDiv);
        });
    });
}

// ===== معالجة الأحداث الرئيسية =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تحميل التطبيق...');
    
    // تهيئة Firebase
    initializeFirebase();
    
    // تحميل البيانات عند بدء التطبيق
    loadStudentsFromFirebase();
    
    // معالجة إرسال النموذج
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }
            
            try {
                const formData = new FormData(this);
                const location = formData.get('location');
                const schedule = formData.get('schedule');
                
                // فحص سعة الفوج
                const currentCount = checkFoujCapacity(location, schedule);
                if (currentCount >= MAX_STUDENTS_PER_FOUJ) {
                    showAlert('عذراً، هذا الفوج مكتمل. يرجى اختيار فوج آخر.', 'danger');
                    return;
                }
                
                // إنشاء بيانات الطالب
                const studentData = {
                    id: Date.now() + Math.random(),
                    registrationDate: new Date().toLocaleDateString('ar-DZ'),
                    foujKey: getFoujKey(location, schedule),
                    foujName: getFoujName(location, schedule),
                    studentType: formData.get('studentType'),
                    school: formData.get('school') || 'غير محدد',
                    fullName: formData.get('fullName'),
                    birthDate: formData.get('birthDate'),
                    branch: formData.get('branch'),
                    averageGrade: formData.get('averageGrade'),
                    mathLevel: formData.get('mathLevel'),
                    personalPhone: formData.get('personalPhone'),
                    guardianPhone: formData.get('guardianPhone'),
                    location: location,
                    schedule: schedule
                };
                
                // محاولة حفظ في Firebase
                const savedToFirebase = await saveStudentToFirebase(studentData);
                
                // إضافة للبيانات المحلية
                registeredStudents.push(studentData);
                localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
                
                // تحديث نص التأكيد
                const confirmationText = document.getElementById('foujConfirmationText');
                if (confirmationText) {
                    confirmationText.innerHTML = `تم تسجيلك بنجاح في <strong>${studentData.foujName}</strong>.<br>معلوماتك وصلتنا بنجاح، حضور الحصة الأولى ضروري لتأكيد التسجيل.`;
                }
                
                // إظهار رسالة حالة الحفظ
                const saveStatusMessage = document.getElementById('saveStatusMessage');
                if (saveStatusMessage) {
                    saveStatusMessage.style.display = 'flex';
                    if (savedToFirebase) {
                        saveStatusMessage.className = '';
                        saveStatusMessage.innerHTML = `
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>تم حفظ بياناتك في قاعدة البيانات المشتركة بنجاح! ✅</span>
                        `;
                    } else {
                        saveStatusMessage.className = 'warning';
                        saveStatusMessage.innerHTML = `
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>تم حفظ بياناتك محلياً - سيتم رفعها عند توفر الإنترنت</span>
                        `;
                    }
                }
                
                // عرض صفحة التأكيد
                showPage('confirmationPage');
                
                // إعادة تعيين النموذج
                this.reset();
                document.getElementById('schoolField').style.display = 'none';
                document.getElementById('scheduleOptions').style.display = 'none';
                document.getElementById('mapContainer').style.display = 'none';
                const notice = document.getElementById('foujFullNotice');
                if (notice) notice.style.display = 'none';
                
            } catch (error) {
                console.error('خطأ في التسجيل:', error);
                showAlert('حدث خطأ في التسجيل. يرجى المحاولة مرة أخرى.', 'danger');
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        });
    }
    
    // إنشاء زر لوحة التحكم
    setTimeout(createAdminButton, 500);
    
    // إضافة الرموز الرياضياتية
    setTimeout(addMoreMathSymbols, 1000);
    
    console.log('✅ التطبيق جاهز للاستخدام');
});

// مستمع للاختصارات
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        accessAdminPanel();
    }
});

// تحديث الراديو بوتونز بصرياً
document.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
        document.querySelectorAll(`input[name="${e.target.name}"]`).forEach(radio => {
            const label = radio.closest('.radio-label');
            if (label) {
                label.classList.remove('selected');
            }
        });
        
        const selectedLabel = e.target.closest('.radio-label');
        if (selectedLabel) {
            selectedLabel.classList.add('selected');
        }
    }
});

// تأثيرات الحركة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.classList.add('fade-in');
    }
    
    document.querySelectorAll('.register-btn, .submit-btn, .back-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// إضافة تأثيرات للإدخال
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        document.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('focus', function() {
                const parent = this.parentElement;
                if (parent) {
                    parent.classList.add('focused');
                }
            });
            
            input.addEventListener('blur', function() {
                const parent = this.parentElement;
                if (parent) {
                    parent.classList.remove('focused');
                }
            });
        });
    }, 100);
});

// مراقبة حالة الإنترنت
window.addEventListener('online', function() {
    updateConnectionStatus('connected');
    console.log('🌐 الإنترنت متصل - محاولة إعادة تهيئة Firebase');
    
    setTimeout(() => {
        initializeFirebase();
        loadStudentsFromFirebase();
    }, 1000);
});

window.addEventListener('offline', function() {
    updateConnectionStatus('offline');
    console.log('📱 وضع عدم الاتصال - استخدام البيانات المحلية');
});

console.log('🔥 Firebase Integration Script تم تحميله بنجاح');
