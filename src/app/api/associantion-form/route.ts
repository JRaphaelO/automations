import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFormData = (formData: any) => {
    const fields = formData['fields'];
    const values = formData['values'];

    const fieldsArray = fields.split(",");
    const valuesArray = values.split(",");

    const keyValueArray: { chave: string; valor: string | null }[] = [];
    let currentIndex = 0;

    for (let index = 0; index < fieldsArray.length; index++) {
        const key = fieldsArray[index].trim();

        const valueArray: string[] = [];
        if (!valuesArray[currentIndex].startsWith('"') && !valuesArray[currentIndex].endsWith('"')) {
            valueArray.push(valuesArray[currentIndex].trim());
        }

        while (currentIndex < valuesArray.length && (valuesArray[currentIndex].endsWith('"') || valuesArray[currentIndex].startsWith('"'))) {
            valueArray.push(valuesArray[currentIndex].trim());
            currentIndex++;
        }

        let value = valueArray.join(",").trim();

        if ((value.startsWith('"') && value.endsWith('"'))) {
            currentIndex--;
            value = value.slice(1, -1);
        }

        value = value;

        const keyValueObject: { chave: string, valor: string | null } = {
            chave: key,
            valor: value || null
        }

        keyValueArray.push(keyValueObject);

        currentIndex++;
    }

    const inputDataObject: { [key: string]: string | null } = {};
    keyValueArray.forEach((item) => {
        inputDataObject[item.chave] = item.valor;
    });

    inputDataObject['CREATED_AT'] = formData['CREATED_AT'];

    return inputDataObject;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createSigner = (formData: any) => {
    const phone = formData['TELEFONE'];
    let phoneCountryCode = null;
    let phoneNumber: string | null = null;
    if (phone != null) {
        const phoneSplited = phone.split(' ');
        phoneCountryCode = phoneSplited[0];
        phoneNumber = `${phoneSplited[1]} ${phoneSplited[2]}`;
    }

    const data = new Date(formData['CREATED_AT']);
    const formattedDate = `${data.getDate()}-${data.getMonth() + 1}-${data.getFullYear()}`;

    const birthDate = new Date(formData['DATA NASCIMENTO']);
    const formattedBirthDate = `${birthDate.getFullYear()}-${birthDate.getMonth() + 1}-${birthDate.getDate()}`;

    const formattedValorPlano = formData['VALOR PLANO'] != null ? formData['VALOR PLANO'].replace('.', ',') : '';

    return {
        name: formData['NOME'],
        email: formData['EMAIL'],
        social_security_number: formData['CPF'],
        address: formData['ENDERECO'],
        country_code: phoneCountryCode,
        phone_number: phoneNumber,
        city: formData['CIDADE'],
        state: formData['ESTADO'],
        cep: formData['CEP'],
        birth_date: formattedBirthDate,
        data: formattedDate,
        nameResponsible: formData['REPRESENTANTE NOME'],
        cpfResponsible: formData['REPRESENTANTE CPF'],
        rg: formData['RG'],
        profissao: formData['Profissao'],
        estadoCivil: formData['Estado civil'],
        plano: formData['PLANO'],
        valorPlano: formattedValorPlano
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createDoc = async (apiToken: string, docId: string, signer: any) => {
    const signerName = docId == '40c855a6-7f29-46db-8817-3a40d086e342' ? signer.name : (signer.nameResponsible || signer.name);
    const data = ['c72e345c-3e62-4888-bec2-00bc52ccd759', 'd6d91a72-28a4-4460-930a-da9cc7b42aa0', '772b7342-d28d-4c2f-aeea-6b2a38b6cc8b', '70695c73-9350-4cc6-b56b-c08fb9dbac10'].includes(docId) ? signer.data : signer.birth_date;
    const name = docId == 'cadf1194-a3cb-4c95-beb0-1a082ebb6d36' ? (signer.nameResponsible || signer.name) : signer.name;

    const raw = JSON.stringify({
        "template_id": docId,
        "signer_name":  signerName,
        "signer_email": signer.email,
        "signer_phone_country": signer.country_code,
        "signer_phone_number": signer.phone_number,
        "send_automatic_email": true,
        "send_automatic_whatsapp": false,
        "lang": "pt-br",
        "external_id": null,
        "data": [
            {
                "de": "{{Nome}}",
                "para": name
            },
            {
                "de": "{{CPF}}",
                "para": signer.social_security_number
            },
            {
                "de": "{{Endereço}}",
                "para": signer.address
            },
            {
                "de": "{{Cidade}}",
                "para": signer.city
            },
            {
                "de": "{{Estado}}",
                "para": signer.state
            },
            {
                "de": "{{CEP}}",
                "para": signer.cep
            },
            {
                "de": "{{Data}}",
                "para": signer.data
            },
            {
                "de": "{{data}}",
                "para": data
            },
            {
                "de": "{{RG}}",
                "para": signer.rg
            },
            {
                "de": "{{Profissao}}",
                "para": signer.profissao
            },
            {
                "de": "{{Estado Civil}}",
                "para": signer.estadoCivil
            },
            {
                "de": "{{Representante}}",
                "para": signer.nameResponsible
            },
            {
                "de": "{{CPFRepresentante}}",
                "para": signer.cpfResponsible
            },
            {
                "de": "{{ValorPlano}}",
                "para": signer.valorPlano
            },
            {
                "de": "{{Plano}}",
                "para": signer.plano
            }
        ]
    });

    const response = await fetch("https://api.zapsign.com.br/api/v1/models/create-doc/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiToken}`
        },
        body: raw,
        redirect: "follow"
    });

    if (response.status !== 200) {
        throw new Error(JSON.stringify(response));
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();

    // Check if the body is empty
    if (!body) {
        return NextResponse.json({ body: "No body provided" }, { status: 400 });
    }

    const formData = createFormData(body);
    const signer = createSigner(formData);
    const apiToken: string = process.env.ZAPSIGN_API_TOKEN || '';
    if (!apiToken) {
        return NextResponse.json({ body: "API token is missing" }, { status: 500 });
    }

    const docId = formData['DOC ID'];
    if (!docId) {
        return NextResponse.json({ body: "Doc ID is missing" }, { status: 400 });
    }

    try {
        await createDoc(apiToken, docId, signer);

        if (formData['PROCURACAO ID'] != null) {
            await createDoc(apiToken, formData['PROCURACAO ID'], signer);
        }

        if (formData['DECLARACAO ID'] != null) {
            await createDoc(apiToken, formData['DECLARACAO ID'], signer);
        }
    } catch (error) {
        return NextResponse.json({ body: error }, { status: 500 });
    }


    return new NextResponse(null, { status: 204 });
}