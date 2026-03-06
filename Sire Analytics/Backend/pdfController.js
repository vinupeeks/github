const generateVesselPdfReport = async (req, res) => {
    try {

        const imagePath = req.file.path;

        const metadata = JSON.parse(req.body.metadata);

        const { vesselName, totalScore, hardwareScore, processScore, humanScore, photoScore, data, inspectionDate } = metadata

        const summeryValueMap = [
            { name: "Hardware", value: hardwareScore },
            { name: "Process", value: processScore },
            { name: "Human", value: humanScore },
            { name: "Photo", value: photoScore },
        ]

        const graphPath = path.join(__dirname, `../../${imagePath}`);
        const graphBase64 = fs.readFileSync(graphPath, { encoding: 'base64' });

        const templatePath = path.join(__dirname, '../../app/template/report_template.html');
        let html = fs.readFileSync(templatePath, 'utf8');

        const content = `
            <div class="page-one">
                <div class="logoContainer">
                    <img src="https://sire2analysis.solmarinetech.com/assets/logo2-BzkhFYkh.png" class="logo" />
                </div>
                <div class="titleContainer">
                    <span class="title">${vesselName} - SIRE 2.0 Analysis</span><br/>
                    <span> Inspection Date: ${inspectionDate} </span>
                </div>
                <div class="card-summery">
                    <div>
                        <span class="card-summery-title">Total Severity Score - ${totalScore.total}</span>
                    </div>
                    <div class="split-score-container">
                        <div class="core">Total Core Question Severity Score: ${totalScore.core}</div>
                        <div class="rotational">Total Rotational Question Severity Score: ${totalScore.rotational}</div>
                    </div>
                    <div class="category-score-container">
                        ${summeryValueMap
                .map((item) => `
                                <div class="score-categories">
                                    <div class="score-categories-header">
                                        <span>Total ${item.name} Severity Score</span>
                                        <span class="total-score-circle total-bg">${item.value.total}</span>
                                    </div>
                                    <hr />
                                    <div class="split-type-score-container">
                                        <div>
                                            <span class="score-label">Total ${item.name} Severity Score for Core Question</span>
                                            <span class="core-score-circle core-bg">${item.value.core}</span>
                                        </div>
                                        ${item.name !== "Photo" ?
                        `<div>
                                                <span class="score-label">Total ${item.name} Severity Score for Rotational Question</span>
                                                <span class="rotational-score-circle rotational-bg">${item.value.rotational}</span>
                                            </div>`: ""
                    }
                                    </div>
                                </div>
                            `)
                .join("")}
                    </div>
                </div>
            </div>
            <div class="page-two">
                <img src="data:image/png;base64,${graphBase64}" class="graph" />
            </div>
            <div class="page-three">

                ${data.some(item => item.humanPositives && item.humanPositives.length > 0) ? `
                    <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 15px">

                        <div class="obsertion-title-container positive">
                            <span class="card-summery-title">Questions with positive observations</span>
                        </div>
                        ${data
                    .filter(item => item.humanPositives.length > 0)
                    .map(item => {
                        return `
                            <div class="obsertion-card">
                                <div class="viq-title">
                                    <div class="viq-number">VIQ ${item.question_no}</div>
                                    <div class="${item.tag === 'Core' ? 'tag-core' : 'tag-rotational'}">${item.tag}</div>
                                </div>

                                <div style="margin-top: 10px; font-size: 12px">
                                    <span>${item.question}</span>
                                </div>

                                ${item.humanPositives && item.humanPositives.length > 0 ? `
                                    <div style="margin-top: 15px;">
                                    <div class="section-title">Human Positives Responses</div>
                                    ${item.humanPositives.map(human => `
                                        <div class="bg-hardware-neg break-avoid" style="margin-top: 10px;">
                                            <div class="title-neg">Human Positive</div>

                                            <div class="neg-label">Negative:</div>
                                            <div class="neg-value">${human.negative}</div>

                                            <div class="neg-label">SOC:</div>
                                            <div class="neg-value">${human.soc}</div>

                                            <div class="neg-label">NOC:</div>
                                            <div class="neg-value">${human.noc}</div>

                                            <div class="neg-label">Remark:</div>
                                            <div class="neg-value">${human.remark}</div>
                                        </div>
                                    `).join("")}
                                    </div>
                                ` : ""}

                            </div>
                        `;
                    }).join("")}
                    </div>
                ` : ""}

                <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 15px">
                    <div class="obsertion-title-container negative">
                        <span class="card-summery-title">Questions with negative observations</span>
                    </div>
                    ${data
                // .filter(item => item.hardwareNegatives.length > 0 || item.humanNegatives.length > 0 || item.processNegatives.length > 0 || item.photoNegatives.length > 0)
                .filter(item =>
                    item.hardwareNegatives?.length > 0 ||
                    item.hardwareLargely?.length > 0 ||

                    item.processNegatives?.length > 0 ||
                    item.processLargely?.length > 0 ||

                    item.humanNegatives?.length > 0 ||
                    item.humanLargely?.length > 0 ||

                    item.photoNegatives?.length > 0 ||
                    item.photoLargely?.length > 0
                )
                .map(item => {
                    return `
                        <div class="obsertion-card">
                            <div class="viq-title">
                                <div class="viq-number">VIQ ${item.question_no}</div>
                                <div class="${item.tag === 'Core' ? 'tag-core' : 'tag-rotational'}">${item.tag}</div>
                            </div>

                            <div style="margin-top: 10px; font-size: 12px">
                                <span>${item.question}</span>
                            </div>

                            ${item.hardwareNegatives && item.hardwareNegatives.length > 0 ? `
                                <div style="margin-top: 15px;">
                                <div class="section-title">Hardware Negatives Responses</div>
                                ${item.hardwareNegatives.map(hardware => `
                                    <div class="bg-hardware-neg break-avoid" style="margin-top: 10px;">
                                        <div class="title-neg">
                                            Hardware Negative
                                            <span>Severity Score: ${hardware.score}</span>
                                        </div>

                                        <div class="neg-label">Negative:</div>
                                        <div class="neg-value">${hardware.negative}</div>

                                        <div class="neg-label">SOC:</div>
                                        <div class="neg-value">${hardware.soc}</div>

                                        <div class="neg-label">NOC:</div>
                                        <div class="neg-value">${hardware.noc}</div>

                                        <div class="neg-label">Remark:</div>
                                        <div class="neg-value">${hardware.remark}</div>
                                    </div>
                                `).join("")}
                                </div>
                            ` : ""}

                            ${item.hardwareLargely && item.hardwareLargely.length > 0 ? `
                              <div style="margin-top: 15px;">
                                <div class="section-title">Hardware Largely Responses</div>
                                ${item.hardwareLargely.map(hardware => `
                                  <div class="bg-largely break-avoid" style="margin-top: 10px;">
                                    <div class="title-neg">
                                      Hardware Largely
                                      <span>Severity Score: ${hardware.score}</span>
                                    </div>
                                
                                    <div class="neg-label">Largely:</div>
                                    <div class="neg-value">${hardware.negative}</div>
                                
                                    <div class="neg-label">SOC:</div>
                                    <div class="neg-value">${hardware.soc}</div>
                                
                                    <div class="neg-label">NOC:</div>
                                    <div class="neg-value">${hardware.noc}</div>
                                
                                    <div class="neg-label">Remark:</div>
                                    <div class="neg-value">${hardware.remark}</div>
                                  </div>
                                `).join("")}
                              </div>
                            ` : ""}

                             ${item.processNegatives && item.processNegatives.length > 0 ? `
                                <div style="margin-top: 15px;">
                                <div class="section-title">Process Negatives Responses</div>
                                ${item.processNegatives.map(process => `
                                    <div class="bg-process-neg break-avoid" style="margin-top: 10px;">
                                        <div class="title-neg">
                                            Process Negative
                                            <span>Severity Score: ${process.score}</span>
                                        </div>

                                        <div class="neg-label">Negative:</div>
                                        <div class="neg-value">${process.negative}</div>

                                        <div class="neg-label">SOC:</div>
                                        <div class="neg-value">${process.soc}</div>

                                        <div class="neg-label">NOC:</div>
                                        <div class="neg-value">${process.noc}</div>

                                        <div class="neg-label">Remark:</div>
                                        <div class="neg-value">${process.remark}</div>
                                    </div>
                                `).join("")}
                                </div>
                            ` : ""}

                            ${item.processLargely && item.processLargely.length > 0 ? `
                              <div style="margin-top: 15px;">
                                <div class="section-title">Process Largely Responses</div>
                                ${item.processLargely.map(process => `
                                  <div class="bg-largely break-avoid" style="margin-top: 10px;">
                                    <div class="title-neg">
                                      Process Largely
                                      <span>Severity Score: ${process.score}</span>
                                    </div>
                                
                                    <div class="neg-label">Largely:</div>
                                    <div class="neg-value">${process.negative}</div>
                                
                                    <div class="neg-label">SOC:</div>
                                    <div class="neg-value">${process.soc}</div>
                                
                                    <div class="neg-label">NOC:</div>
                                    <div class="neg-value">${process.noc}</div>
                                
                                    <div class="neg-label">Remark:</div>
                                    <div class="neg-value">${process.remark}</div>
                                  </div>
                                `).join("")}
                              </div>
                            ` : ""}

                             ${item.humanNegatives && item.humanNegatives.length > 0 ? `
                                <div style="margin-top: 15px;">
                                <div class="section-title">Human Negatives Responses</div>
                                ${item.humanNegatives.map(human => `
                                    <div class="bg-human-neg break-avoid" style="margin-top: 10px;">
                                        <div class="title-neg">
                                            Human Negative
                                            <span>Severity Score: ${human.score}</span>
                                        </div>

                                        <div class="neg-label">Negative:</div>
                                        <div class="neg-value">${human.negative}</div>

                                        <div class="neg-label">SOC:</div>
                                        <div class="neg-value">${human.soc}</div>

                                        <div class="neg-label">NOC:</div>
                                        <div class="neg-value">${human.noc}</div>

                                        <div class="neg-label">Remark:</div>
                                        <div class="neg-value">${human.remark}</div>
                                    </div>
                                `).join("")}
                                </div>
                            ` : ""}

                            ${item.humanLargely && item.humanLargely.length > 0 ? `
                              <div style="margin-top: 15px;">
                                <div class="section-title">Human Largely Responses</div>
                                ${item.humanLargely.map(human => `
                                  <div class="bg-largely break-avoid" style="margin-top: 10px;">
                                    <div class="title-neg">
                                      Human Largely
                                      <span>Severity Score: ${human.score}</span>
                                    </div>
                                
                                    <div class="neg-label">Largely:</div>
                                    <div class="neg-value">${human.negative}</div>
                                
                                    <div class="neg-label">SOC:</div>
                                    <div class="neg-value">${human.soc}</div>
                                
                                    <div class="neg-label">NOC:</div>
                                    <div class="neg-value">${human.noc}</div>
                                
                                    <div class="neg-label">Remark:</div>
                                    <div class="neg-value">${human.remark}</div>
                                  </div>
                                `).join("")}
                              </div>
                            ` : ""}

                            ${item.photoNegatives && item.photoNegatives.length > 0 ? `
                                <div style="margin-top: 15px;">
                                <div class="section-title">Photo Negatives Responses</div>
                                ${item.photoNegatives.map(photo => `
                                    <div class="bg-photo-neg break-avoid" style="margin-top: 10px;">
                                        <div class="title-neg">
                                            Photo Negative
                                            <span>Severity Score: ${photo.score}</span>
                                        </div>

                                        <div class="neg-label">Negative:</div>
                                        <div class="neg-value">${photo.negative}</div>

                                        <div class="neg-label">SOC:</div>
                                        <div class="neg-value">${photo.soc}</div>

                                        <div class="neg-label">NOC:</div>
                                        <div class="neg-value">${photo.noc}</div>

                                        <div class="neg-label">Remark:</div>
                                        <div class="neg-value">${photo.remark}</div>
                                    </div>
                                `).join("")}
                                </div>
                            ` : ""}

                            ${item.photoLargely && item.photoLargely.length > 0 ? `
                              <div style="margin-top: 15px;">
                                <div class="section-title">Photo Largely Responses</div>
                                ${item.photoLargely.map(photo => `
                                  <div class="bg-largely break-avoid" style="margin-top: 10px;">
                                    <div class="title-neg">
                                      Photo Largely
                                      <span>Severity Score: ${photo.score}</span>
                                    </div>
                                
                                    <div class="neg-label">Largely:</div>
                                    <div class="neg-value">${photo.negative}</div>
                                
                                    <div class="neg-label">SOC:</div>
                                    <div class="neg-value">${photo.soc}</div>
                                
                                    <div class="neg-label">NOC:</div>
                                    <div class="neg-value">${photo.noc}</div>
                                
                                    <div class="neg-label">Remark:</div>
                                    <div class="neg-value">${photo.remark}</div>
                                  </div>
                                `).join("")}
                              </div>
                            ` : ""}

                        </div>
                    `;
                }).join("")}

                </div>

                 <div class="end-report-gradient">
                    <div class="gradient-inner">
                        <div class="gradient-text">End of the Report</div>
                    </div>
                </div>
            </div>
        `

        html = html.replace('<!-- Dynamic content will be inserted here -->', content);

        const browser = await puppeteer.launch({
            headless: true, // Run in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: false,
            margin: {
                top: '0.5cm',
                bottom: '0.5cm',
            }
        });

        await browser.close();

        const outputPath = path.join(__dirname, `../../files/output_${moment().unix()}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);

        res.download(outputPath, 'inspection-report.pdf', (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Failed to download PDF');
            }
            fs.unlink(outputPath, () => { });
            fs.unlink(imagePath, () => { });
        });

    }
    catch (err) {
        console.log(err)
        // res.status(500).json({error: err.message})
    }
}