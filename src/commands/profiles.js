import inquirer from 'inquirer';
import {
    activeProfile,
    chatHistory,
    profiles,
    saveProfiles,
    setActiveProfile
} from '../config/database.js';
import { analyzeConversationStyle } from '../services/ai.js';

export async function listProfiles() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles registrados.');
        return;
    }

    console.log('\n📋 Perfiles registrados:');
    console.log('='.repeat(60));

    profiles.forEach((profile, index) => {
        const status = profile.active ? '✅ ACTIVO' : '⭕ Inactivo';
        console.log(`\n${index + 1}. ${profile.name} ${status}`);
        console.log(`   📞 Teléfono: ${profile.phone}`);
        console.log(`   🎭 Tono: ${profile.tone}`);
        if (profile.systemInstruction) {
            console.log(`   📝 Instrucciones: ${profile.systemInstruction.substring(0, 100)}...`);
        }
        if (profile.customStyle) {
            console.log(`   🎨 Estilo personalizado: ${profile.customStyle.substring(0, 100)}...`);
        }
    });
}

export async function createProfile() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Nombre del perfil:',
            validate: input => input.trim() !== '' || 'El nombre es requerido'
        },
        {
            type: 'input',
            name: 'phone',
            message: 'Número de teléfono:',
            validate: input => input.trim() !== '' || 'El teléfono es requerido'
        },
        {
            type: 'list',
            name: 'tone',
            message: 'Tono de respuesta:',
            choices: [
                { name: '😊 Amigable - Respuestas casuales y cercanas', value: 'amigable' },
                { name: '💼 Profesional - Formal y directo al punto', value: 'profesional' },
                { name: '😄 Divertido - Con humor y emojis', value: 'divertido' },
                { name: '😐 Serio - Respuestas concisas y formales', value: 'serio' }
            ]
        },
        {
            type: 'input',
            name: 'systemInstruction',
            message: 'System Instruction (opcional):',
            default: 'Bla bla bla'
        },
        {
            type: 'confirm',
            name: 'active',
            message: '¿Activar este perfil?',
            default: false
        }
    ]);

    const newProfile = {
        id: Date.now(),
        name: answers.name,
        phone: answers.phone,
        tone: answers.tone,
        systemInstruction: answers.systemInstruction || '',
        active: answers.active,
        learnFromChat: null,
        customStyle: 'Habla como un joven mexicano real, usa modismos del español mexicano, respuestas cortas y naturales, expresiones como "xd", "ps", "we", "bro", "tons", "nel", "ajam", etc. Sé casual y relajado.'
    };

    if (answers.active) {
        profiles.forEach(p => p.active = false);
        setActiveProfile(newProfile);
    }

    profiles.push(newProfile);
    await saveProfiles();

    console.log('✅ Perfil creado correctamente.');
}

// Función para editar un perfil existente
export async function editProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para editar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a editar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone}) - ${p.active ? 'ACTIVO' : 'Inactivo'}`,
                value: p.id
            }))
        }
    ]);

    const profile = profiles.find(p => p.id === profileId);

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Nombre del perfil:',
            default: profile.name
        },
        {
            type: 'input',
            name: 'phone',
            message: 'Número de teléfono:',
            default: profile.phone
        },
        {
            type: 'list',
            name: 'tone',
            message: 'Tono de respuesta:',
            default: profile.tone,
            choices: [
                { name: '😊 Amigable', value: 'amigable' },
                { name: '💼 Profesional', value: 'profesional' },
                { name: '😄 Divertido', value: 'divertido' },
                { name: '😐 Serio', value: 'serio' }
            ]
        },
        {
            type: 'input',
            name: 'systemInstruction',
            message: 'System Instruction:',
            default: profile.systemInstruction
        }
    ]);

    Object.assign(profile, answers);
    await saveProfiles();

    if (activeProfile && activeProfile.id === profileId) {
        setActiveProfile(profile);
    }

    console.log('✅ Perfil actualizado correctamente.');
}

export async function deleteProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para eliminar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a eliminar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone})`,
                value: p.id
            }))
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres eliminar este perfil?',
            default: false
        }
    ]);

    if (confirm) {
        const profileIndex = profiles.findIndex(p => p.id === profileId);
        const deletedProfile = profiles[profileIndex];

        profiles.splice(profileIndex, 1);

        if (activeProfile && activeProfile.id === profileId && profiles.length > 0) {
            profiles[0].active = true;
            setActiveProfile(profiles[0]);
        }

        await saveProfiles();
        console.log('✅ Perfil eliminado correctamente.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

// Función para activar un perfil
export async function activateProfile() {
    if (profiles.length === 0) {
        console.log('📭 No hay perfiles para activar.');
        return;
    }

    const { profileId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'profileId',
            message: 'Selecciona el perfil a activar:',
            choices: profiles.map(p => ({
                name: `${p.name} (${p.phone}) - ${p.active ? 'YA ACTIVO' : 'Inactivo'}`,
                value: p.id
            }))
        }
    ]);

    profiles.forEach(p => p.active = false);
    const profile = profiles.find(p => p.id === profileId);
    profile.active = true;
    setActiveProfile(profile);

    await saveProfiles();
    console.log(`✅ Perfil "${profile.name}" activado correctamente.`);
}

// Función para analizar estilo de conversación
export async function analyzeStyle() {
    const { chatNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'chatNumber',
            message: 'Número de chat para analizar (ej: 9511110360):',
            validate: input => input.trim() !== '' || 'El número es requerido'
        }
    ]);

    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;

    console.log('🔍 Analizando estilo de conversación...');

    const styleAnalysis = await analyzeConversationStyle(formattedNumber, chatHistory);

    console.log('\n🎨 Análisis de estilo:');
    console.log('='.repeat(60));
    console.log(styleAnalysis);

    const { applyToProfile } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'applyToProfile',
            message: '¿Quieres aplicar este estilo a un perfil?',
            default: false
        }
    ]);

    if (applyToProfile && profiles.length > 0) {
        const { profileId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'profileId',
                message: 'Selecciona el perfil:',
                choices: profiles.map(p => ({
                    name: `${p.name} (${p.phone})`,
                    value: p.id
                }))
            }
        ]);

        const profile = profiles.find(p => p.id === profileId);
        profile.learnFromChat = chatNumber;
        profile.customStyle = styleAnalysis;

        await saveProfiles();

        if (activeProfile && activeProfile.id === profileId) {
            setActiveProfile(profile);
        }

        console.log(`✅ Estilo aplicado al perfil "${profile.name}".`);
    }
}

// Función principal para manejar comandos de perfiles
export async function handleProfilesCommand() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '¿Qué deseas hacer con los perfiles?',
            choices: [
                { name: '📋 Listar perfiles', value: 'list' },
                { name: '➕ Crear nuevo perfil', value: 'create' },
                { name: '✏️  Editar perfil', value: 'edit' },
                { name: '🗑️  Eliminar perfil', value: 'delete' },
                { name: '✅ Activar perfil', value: 'activate' },
                { name: '🎭 Analizar estilo de chat', value: 'analyze' }
            ]
        }
    ]);

    switch (action) {
        case 'list':
            await listProfiles();
            break;
        case 'create':
            await createProfile();
            break;
        case 'edit':
            await editProfile();
            break;
        case 'delete':
            await deleteProfile();
            break;
        case 'activate':
            await activateProfile();
            break;
        case 'analyze':
            await analyzeStyle();
            break;
    }
}
