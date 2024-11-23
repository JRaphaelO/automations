import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const body = await request.json();
    console.log('Request Body:', body); // Log de diagnóstico

    // Check if the body is empty
    if (!body) {
        return NextResponse.json({ body: "No body provided" }, { status: 400 });
    }

    const phone = body.phone;
    let countryCodePhone = null;
    let numberPhone = null;
    if (phone) {
        const phoneArray = phone.split(' ');
        countryCodePhone = phoneArray[0];
        numberPhone = `${phoneArray[1]} ${phoneArray[2]}`;
    }

    let signerName = body.name;
    let docId = process.env.PLAN_DOC_TEMPLATE_ID;
    // Check if the body sent responsables in the body
    if (body.nameResponsable && body.cpfResponsable) {
        signerName = body.nameResponsable;
        docId = process.env.RESPONSABLE_PLAN_DOC_TEMPLATE_ID;
    }

    console.log('Doc ID:', docId); // Log de diagnóstico

    const created_at = new Date();
    const formattedDate = `${created_at.getDate()}-${created_at.getMonth()}-${created_at.getFullYear()}`;

    let addressFormatted = body.address + ' - ' + body.number;
    if (body.complement !== '' && body.complement !== null) {
        addressFormatted += ', ' + body.complement;
    }

    const raw = JSON.stringify({
        'template_id': docId,
        'signer_name': signerName,
        'signer_email': body.email,
        'signer_phone_country': countryCodePhone,
        'signer_phone_number': numberPhone,
        'send_automatic_email': true,
        'send_automatic_whatsapp': false,
        'lang': 'pt-br',
        'external_id': null,
        'data': [
            {
                'de': '{{Nome}}',
                'para': body.name
            },
            {
                'de': '{{CPF}}',
                'para': body.cpf
            },
            {
                'de': '{{Endereço}}',
                'para': addressFormatted
            },
            {
                'de': '{{Cidade}}',
                'para': body.city
            },
            {
                'de': '{{Estado}}',
                'para': body.state
            },
            {
                'de': '{{CEP}}',
                'para': body.zipCode
            },
            {
                'de': '{{Plano}}',
                'para': body.plan
            },
            {
                'de': '{{planValue}}',
                'para': body.planValue
            },
            {
                'de': '{{data}}',
                'para': formattedDate
            },
            {
                'de': '{{Representante}}',
                'para': body.nameResponsable
            },
            {
                'de': '{{CPFRepresentante}}',
                'para': body.cpfResponsable
            }
        ]
    });

    const response = await fetch("https://api.zapsign.com.br/api/v1/models/create-doc/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ZAPSIGN_API_TOKEN}`
        },
        body: raw,
        redirect: 'follow'
    });

    if (response.status !== 200) {
        return NextResponse.json({ body: "Error on Zapsign API", raw, response }, { status: 500 });
    }

    console.log('Response:', response); // Log de diagnóstico

    // Return no content
    return new NextResponse(null, { status: 204 });
}