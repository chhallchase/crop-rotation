class CropRotationOptimizer {
    constructor() {
        this.plots = [];
        this.colors = ['yellow', 'red', 'blue'];
        this.colorEmojis = { yellow: '🟡', red: '🔴', blue: '🔵' };
        this.colorNames = { yellow: 'Yellow (Primal)', red: 'Red (Wild)', blue: 'Blue (Vivid)' };
        
        // Upgrade probabilities
        this.upgradeProbabilities = {
            1: 0.25, // T1 → T2
            2: 0.20, // T2 → T3
            3: 0.05  // T3 → T4
        };

        // 🎛️ COMPUTATION SETTINGS - Easy to adjust!
        this.computationSettings = {
            lookaheadDepth: 7,           // How many steps ahead to plan (1 = immediate next step only)
            maxBranchingFactor: 80000,    // Max number of sequences to evaluate per step
            probabilityThreshold: 0.01,  // Ignore probability branches below this threshold
            enableDeepSearch: true       // Whether to use more thorough but slower search
        };
        
        // 🚀 PERFORMANCE OPTIMIZATION: State caching for memoization
        this.stateCache = new Map();
        
        this.initializeUI();
    }

    initializeUI() {
        this.plotCountSelect = document.getElementById('plotCount');
        this.plotsContainer = document.getElementById('plotsContainer');
        this.optimizeBtn = document.getElementById('optimizeBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsContent = document.getElementById('resultsContent');

        // Computation settings UI elements
        this.performancePreset = document.getElementById('performancePreset');
        this.lookaheadDepthInput = document.getElementById('lookaheadDepth');
        this.maxBranchingFactorInput = document.getElementById('maxBranchingFactor');
        this.enableDeepSearchInput = document.getElementById('enableDeepSearch');
        this.probabilityThresholdInput = document.getElementById('probabilityThreshold');
        this.customSettingsDiv = document.getElementById('customSettings');

        this.plotCountSelect.addEventListener('change', () => this.generatePlotConfigs());
        this.optimizeBtn.addEventListener('click', () => this.optimizeRotation());

        // Computation settings event handlers
        this.performancePreset.addEventListener('change', () => this.handlePresetChange());
        this.lookaheadDepthInput.addEventListener('change', () => this.updateComputationSettings());
        this.maxBranchingFactorInput.addEventListener('change', () => this.updateComputationSettings());
        this.enableDeepSearchInput.addEventListener('change', () => this.updateComputationSettings());
        this.probabilityThresholdInput.addEventListener('change', () => this.updateComputationSettings());

        // Initialize with 3 plots
        this.generatePlotConfigs();
        
        // Initialize UI with current settings
        this.syncUIWithSettings();
    }

    generatePlotConfigs() {
        const plotCount = parseInt(this.plotCountSelect.value);
        this.plots = [];
        this.plotsContainer.innerHTML = '';

        for (let i = 0; i < plotCount; i++) {
            this.plots.push({ color1: 'yellow', color2: 'red' });
            this.createPlotConfigUI(i);
        }
    }

    createPlotConfigUI(plotIndex) {
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-config';
        plotDiv.innerHTML = `
            <h3>Plot ${plotIndex + 1}</h3>
            <div class="color-selection">
                <div class="color-group">
                    <label>Color 1:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow active" data-plot="${plotIndex}" data-slot="color1" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red" data-plot="${plotIndex}" data-slot="color1" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color1" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
                <div class="color-group">
                    <label>Color 2:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow" data-plot="${plotIndex}" data-slot="color2" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red active" data-plot="${plotIndex}" data-slot="color2" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color2" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for color selection
        const colorButtons = plotDiv.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectColor(e));
        });

        this.plotsContainer.appendChild(plotDiv);
    }

    selectColor(event) {
        const btn = event.target;
        const plotIndex = parseInt(btn.dataset.plot);
        const slot = btn.dataset.slot;
        const color = btn.dataset.color;

        // Update the plot data
        this.plots[plotIndex][slot] = color;

        // Update UI - remove active class from siblings and add to clicked button
        const siblings = btn.parentElement.querySelectorAll('.color-btn');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        btn.classList.add('active');
    }

    async optimizeRotation() {
        this.showLoading(true);
        
        // Simulate computation time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const result = this.calculateOptimalRotation();
            this.displayResults(result);
        } catch (error) {
            this.displayError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    calculateOptimalRotation() {
        // Clear any pending state from previous optimization
        this.pendingActivationResult = null;
        this.activationHistory = [];
        
        // Start the interactive decision tree
        this.currentGameState = this.getInitialGameState();
        return this.getNextOptimalStep();
    }

    getNextOptimalStep() {
        // Generate possible next activations (field activations)
        const availableActivations = [];
        
        for (const plot of this.currentGameState.availablePlots) {
            if (plot.active) {
                // Check each color in this plot
                plot.colors.forEach((color, colorIndex) => {
                    if (!plot.usedColors.includes(color)) {
                        availableActivations.push({ 
                            plotIndex: plot.index, 
                            color: color,
                            fieldIndex: colorIndex 
                        });
                    }
                });
            }
        }

        if (availableActivations.length === 0) {
            return {
                isComplete: true,
                currentState: this.currentGameState,
                history: this.activationHistory
            };
        }

        // Find best next activation using configurable computation settings
        let bestActivation = null;
        let bestExpectedScore = -1;
        let sequencesEvaluated = 0;
        
        // Cache scores for each activation to avoid recalculation in showAlternativeAnalysis
        const activationScores = new Map();
        
        // Initialize scores for all available activations
        for (const activation of availableActivations) {
            const key = `${activation.plotIndex}_${activation.color}_${activation.fieldIndex}`;
            activationScores.set(key, {
                activation: activation,
                bestScore: -1,
                sequencesEvaluated: 0,
                plotInfo: `Plot ${activation.plotIndex + 1} - ${this.colorEmojis[activation.color]} ${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)}`
            });
        }

        if (this.computationSettings.enableDeepSearch) {
            // More thorough search: generate sequences of different lengths
            const sequences = this.generateLookaheadSequences(
                availableActivations, 
                this.computationSettings.lookaheadDepth
            );
            
            // DEBUG: Check exact field states for Plot 3 Blue vs Plot 4 Blue
            console.log('🔍 DEBUGGING FIELD STATES');
            const plot3BlueField = this.currentGameState.plotFields.find(f => 
                f.plotIndex === 2 && f.color === 'blue' // Plot 3 Blue (0-indexed)
            );
            const plot4BlueField = this.currentGameState.plotFields.find(f => 
                f.plotIndex === 3 && f.color === 'blue' // Plot 4 Blue (0-indexed)
            );
            
            console.log('Plot 3 Blue field:', plot3BlueField);
            console.log('Plot 4 Blue field:', plot4BlueField);
            
            if (plot3BlueField && plot4BlueField) {
                const plot3Seeds = `T1:${plot3BlueField.seeds[1]}, T2:${plot3BlueField.seeds[2]}, T3:${plot3BlueField.seeds[3]}, T4:${plot3BlueField.seeds[4]}`;
                const plot4Seeds = `T1:${plot4BlueField.seeds[1]}, T2:${plot4BlueField.seeds[2]}, T3:${plot4BlueField.seeds[3]}, T4:${plot4BlueField.seeds[4]}`;
                
                console.log(`Plot 3 Blue: ${plot3Seeds}`);
                console.log(`Plot 4 Blue: ${plot4Seeds}`);
                
                const seedsIdentical = plot3BlueField.seeds[1] === plot4BlueField.seeds[1] &&
                                     plot3BlueField.seeds[2] === plot4BlueField.seeds[2] &&
                                     plot3BlueField.seeds[3] === plot4BlueField.seeds[3] &&
                                     plot3BlueField.seeds[4] === plot4BlueField.seeds[4];
                                     
                if (seedsIdentical) {
                    console.log('🚨 CONFIRMED: Plot 3 Blue and Plot 4 Blue have IDENTICAL seed counts!');
                    console.log('This explains why they have identical scores - they are functionally equivalent.');
                } else {
                    console.log('🤔 Plot 3 Blue and Plot 4 Blue have DIFFERENT seed counts, but same scores - this is a bug!');
                }
            }
            
            // DEBUG: Check if Plot 3 Blue and Plot 4 Blue have the same sequences
            console.log('🔍 DEBUGGING SEQUENCE GENERATION');
            const plot3BlueSequences = [];
            const plot4BlueSequences = [];
            
            for (const sequence of sequences) {
                const firstStep = sequence[0];
                if (firstStep.plotIndex === 2 && firstStep.color === 'blue') { // Plot 3 Blue (0-indexed)
                    plot3BlueSequences.push(sequence.map(a => `Plot${a.plotIndex + 1}-${a.color}`).join(' → '));
                }
                if (firstStep.plotIndex === 3 && firstStep.color === 'blue') { // Plot 4 Blue (0-indexed)
                    plot4BlueSequences.push(sequence.map(a => `Plot${a.plotIndex + 1}-${a.color}`).join(' → '));
                }
            }
            
            console.log(`Plot 3 Blue sequences (${plot3BlueSequences.length}):`);
            plot3BlueSequences.slice(0, 10).forEach((seq, i) => console.log(`  ${i + 1}: ${seq}`));
            
            console.log(`Plot 4 Blue sequences (${plot4BlueSequences.length}):`);
            plot4BlueSequences.slice(0, 10).forEach((seq, i) => console.log(`  ${i + 1}: ${seq}`));
            
            // Check if sequences are identical
            const plot3Set = new Set(plot3BlueSequences);
            const plot4Set = new Set(plot4BlueSequences);
            const intersection = [...plot3Set].filter(x => plot4Set.has(x));
            console.log(`Identical sequences between Plot 3 Blue and Plot 4 Blue: ${intersection.length}`);
            if (intersection.length > 0) {
                console.log('🚨 BUG CONFIRMED: Plot 3 Blue and Plot 4 Blue have identical sequences!');
                console.log('First few identical sequences:');
                intersection.slice(0, 5).forEach((seq, i) => console.log(`  ${i + 1}: ${seq}`));
            }
            
            // DEBUG: Log first few sequences to see what's being evaluated
            console.log('Deep search sequences (first 5):');
            sequences.slice(0, 5).forEach((seq, i) => {
                const seqStr = seq.map(a => `Plot${a.plotIndex + 1}-${a.color}`).join(' → ');
                console.log(`  ${i + 1}: ${seqStr}`);
            });
            
            for (const sequence of sequences) {
                if (sequencesEvaluated >= this.computationSettings.maxBranchingFactor) break;
                
                const result = this.calculateExpectedOutcome(sequence, this.currentGameState, 1.0);
                
                // DEBUG: Log scores for first step activations
                // if (sequencesEvaluated < 20) {
                //     const firstStep = sequence[0];
                //     const seqStr = sequence.map(a => `Plot${a.plotIndex + 1}-${a.color}`).join(' → ');
                //     console.log(`Sequence "${seqStr}": Score ${result.expectedScore.toFixed(1)}`);
                // }
                
                // DEBUG: Special logging for Blue field comparisons (COMMENTED OUT - too verbose)
                // const blueFirstStep = sequence[0];
                // if ((blueFirstStep.plotIndex === 2 && blueFirstStep.color === 'blue') || 
                //     (blueFirstStep.plotIndex === 3 && blueFirstStep.color === 'blue')) {
                //     const seqStr = sequence.map(a => `Plot${a.plotIndex + 1}-${a.color}`).join(' → ');
                //     console.log(`🔵 BLUE COMPARISON: "${seqStr}" Score: ${result.expectedScore.toFixed(1)} (T3: ${result.expectedT3.toFixed(1)}, T4: ${result.expectedT4.toFixed(1)})`);
                //     
                //     // If it's a single-step sequence, show more detail about the failure case
                //     if (sequence.length === 1) {
                //         const successState = this.applyFieldActivation(this.currentGameState, blueFirstStep, true);
                //         const failureState = this.applyFieldActivation(this.currentGameState, blueFirstStep, false);
                //         
                //         const successResult = this.calculateExpectedOutcome([], successState, 0.6);
                //         const failureResult = this.calculateExpectedOutcome([], failureState, 0.4);
                //         
                //         console.log(`  Success (60%): T3=${successResult.expectedT3.toFixed(1)}, T4=${failureResult.expectedT4.toFixed(1)}, Score=${successResult.expectedScore.toFixed(1)}`);
                //         console.log(`  Failure (40%): T3=${failureResult.expectedT3.toFixed(1)}, T4=${failureResult.expectedT4.toFixed(1)}, Score=${failureResult.expectedScore.toFixed(1)}`);
                //         console.log(`  Total Expected: ${(successResult.expectedScore + failureResult.expectedScore).toFixed(1)}`);
                //         
                //         // Show what fields become unavailable on failure
                //         const failedPlotFields = failureState.plotFields.filter(f => f.plotIndex === blueFirstStep.plotIndex);
                //         console.log(`  Fields lost on failure:`, failedPlotFields.map(f => `${f.color} (T1:${f.seeds[1]}, T2:${f.seeds[2]})`));
                //     }
                // }
                
                // Update best score for the first step of this sequence
                const firstStep = sequence[0];
                const key = `${firstStep.plotIndex}_${firstStep.color}_${firstStep.fieldIndex}`;
                const scoreData = activationScores.get(key);
                
                if (scoreData && result.expectedScore > scoreData.bestScore) {
                    scoreData.bestScore = result.expectedScore;
                }
                scoreData.sequencesEvaluated++;
                
                // Track overall best for main recommendation
                if (result.expectedScore > bestExpectedScore) {
                    bestExpectedScore = result.expectedScore;
                    bestActivation = sequence[0]; // First step of best sequence
                }
                sequencesEvaluated++;
            }
        } else {
            // Fast search: evaluate each activation individually
            for (const activation of availableActivations) {
                if (sequencesEvaluated >= this.computationSettings.maxBranchingFactor) break;
                
                const sequences = [[activation]]; // Single step sequences
                for (const sequence of sequences) {
                    const result = this.calculateExpectedOutcome(sequence, this.currentGameState, 1.0);
                    
                    // DEBUG: Log scores for comparison
                    console.log(`Single step Plot${activation.plotIndex + 1}-${activation.color}: Score ${result.expectedScore.toFixed(1)}`);
                    
                    // Cache the score
                    const key = `${activation.plotIndex}_${activation.color}_${activation.fieldIndex}`;
                    const scoreData = activationScores.get(key);
                    scoreData.bestScore = result.expectedScore;
                    scoreData.sequencesEvaluated = 1;
                    
                    if (result.expectedScore > bestExpectedScore) {
                        bestExpectedScore = result.expectedScore;
                        bestActivation = activation;
                    }
                }
                sequencesEvaluated++;
            }
        }

        console.log(`Evaluated ${sequencesEvaluated} sequences for next step optimization`);
        
        // DEBUG: Final comparison of Blue fields only (single-step evaluation)
        console.log('🔵 FINAL BLUE FIELD COMPARISON:');
        for (const activation of availableActivations) {
            if (activation.color === 'blue') {
                const singleStepResult = this.calculateExpectedOutcome([activation], this.currentGameState, 1.0);
                console.log(`Plot ${activation.plotIndex + 1} Blue: Score ${singleStepResult.expectedScore.toFixed(1)} (T3: ${singleStepResult.expectedT3.toFixed(1)}, T4: ${singleStepResult.expectedT4.toFixed(1)})`);
                
                // Break down success vs failure
                const successState = this.applyFieldActivation(this.currentGameState, activation, true);
                const failureState = this.applyFieldActivation(this.currentGameState, activation, false);
                
                const successResult = this.calculateExpectedOutcome([], successState, 0.6);
                const failureResult = this.calculateExpectedOutcome([], failureState, 0.4);
                
                console.log(`  Success (60%): T3=${successResult.expectedT3.toFixed(1)}, T4=${successResult.expectedT4.toFixed(1)}, Score=${successResult.expectedScore.toFixed(1)}`);
                console.log(`  Failure (40%): T3=${failureResult.expectedT3.toFixed(1)}, T4=${failureResult.expectedT4.toFixed(1)}, Score=${failureResult.expectedScore.toFixed(1)}`);
                console.log(`  Total Expected: ${(successResult.expectedScore + failureResult.expectedScore).toFixed(1)}`);
                
                // Show what fields become unavailable on failure
                const failedPlotFields = failureState.plotFields.filter(f => f.plotIndex === activation.plotIndex);
                const lostField = failedPlotFields.find(f => !f.used && f.color !== activation.color);
                if (lostField) {
                    console.log(`  Field lost on failure: Plot ${lostField.plotIndex + 1} ${lostField.color} (T1:${lostField.seeds[1]}, T2:${lostField.seeds[2]}, T3:${lostField.seeds[3]})`);
                }
            }
        }

        return {
            isComplete: false,
            nextActivation: bestActivation,
            currentState: this.currentGameState,
            history: this.activationHistory,
            availableActivations: availableActivations,
            expectedScore: bestExpectedScore,
            activationScores: activationScores, // Cache the scores for reuse
            computationInfo: {
                sequencesEvaluated: sequencesEvaluated,
                lookaheadDepth: this.computationSettings.lookaheadDepth,
                deepSearch: this.computationSettings.enableDeepSearch
            }
        };
    }

    generateLookaheadSequences(availableActivations, maxDepth) {
        const sequences = [];
        
        // Generate sequences of different lengths up to maxDepth
        for (let depth = 1; depth <= maxDepth; depth++) {
            this.generateSequencesRecursive(availableActivations, depth, [], sequences);
            
            // Limit total sequences to prevent performance issues
            if (sequences.length >= this.computationSettings.maxBranchingFactor) {
                break;
            }
        }
        
        return sequences.slice(0, this.computationSettings.maxBranchingFactor);
    }

    generateSequencesRecursive(availableActivations, remainingDepth, currentSequence, allSequences) {
        if (remainingDepth === 0) {
            allSequences.push([...currentSequence]);
            return;
        }
        
        for (const activation of availableActivations) {
            // Only prevent activating the same exact field twice (which is impossible)
            // Don't prevent same-plot different-field activations (which are valid)
            const alreadyUsedThisField = currentSequence.some(prev => 
                prev.plotIndex === activation.plotIndex && 
                prev.fieldIndex === activation.fieldIndex
            );
            
            if (alreadyUsedThisField) {
                continue; // Skip this - can't activate the same field twice
            }
            
            currentSequence.push(activation);
            this.generateSequencesRecursive(availableActivations, remainingDepth - 1, currentSequence, allSequences);
            currentSequence.pop();
        }
    }

    processUserInput(success) {
        // Store the success/failure result but DON'T calculate next step yet
        // We need to wait for actual upgrade results first
        
        // Use the already-calculated current step instead of recalculating
        const step = this.currentStep;
        if (!step || step.isComplete || !step.nextActivation) {
            console.error('No current step available');
            return;
        }

        const activation = step.nextActivation;
        
        // Store the success/failure result for later use
        this.pendingActivationResult = { activation, success };
        
        console.log(`User selected ${success ? 'Success' : 'Failure'} for Plot ${activation.plotIndex + 1} ${activation.color}`);
        console.log('Showing upgrade input form - no sequence calculation until after results entered');
        
        // Show upgrade input form - next step calculation will happen after results are entered
        this.showUpgradeInputForm(activation);
    }

    showUpgradeInputForm(activation) {
        const activatedColor = activation.color;
        const isSuccess = this.pendingActivationResult?.success ?? true;
        
        // Find all fields that will be upgraded
        let fieldsToUpgrade;
        if (isSuccess) {
            // Success: Upgrade all fields with different colors
            fieldsToUpgrade = this.currentGameState.plotFields.filter(field => 
                field.color !== activatedColor && !field.used
            );
        } else {
            // Failure: ALSO upgrade all fields with different colors (same as success)
            // The difference is only plot availability, not which fields get upgraded
            fieldsToUpgrade = this.currentGameState.plotFields.filter(field => 
                field.color !== activatedColor && !field.used
            );
        }
        
        // Store the fields that we're generating the form for
        this.pendingActivationResult.fieldsToUpgrade = fieldsToUpgrade;

        let html = `
            <div class="upgrade-input-form" style="background: rgba(76, 205, 196, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: ${isSuccess ? '#4ecdc4' : '#ff6b6b'}; margin-bottom: 15px;">
                    ${isSuccess ? '✅ Activation Successful!' : '❌ Activation Failed!'}
                </h4>
                <p style="margin-bottom: 15px;">
                    <strong>Plot ${activation.plotIndex + 1} - ${this.colorEmojis[activatedColor]} ${activatedColor.charAt(0).toUpperCase() + activatedColor.slice(1)}</strong> 
                    ${isSuccess ? 'succeeded' : 'failed'}!
                </p>
                <p style="margin-bottom: 20px; color: #b0b0b0;">
                    ${isSuccess 
                        ? 'All non-activated color fields get upgraded, and you can activate the other field in this plot later.'
                        : 'All non-activated color fields in OTHER plots get upgraded. This entire plot becomes unavailable.'
                    }
                </p>
                <p style="margin-bottom: 20px; color: #b0b0b0;">
                    Please enter the actual upgrade results for each affected field:
                </p>
                
                <div class="upgrade-inputs">
        `;

        fieldsToUpgrade.forEach((field, index) => {
            html += `
                <div class="field-upgrade-input" style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h5 style="color: #ffd700; margin-bottom: 10px;">
                        Plot ${field.plotIndex + 1} - ${this.colorEmojis[field.color]} ${this.colorNames[field.color]} Field
                    </h5>
                    <div style="font-size: 0.9rem; color: #888; margin-bottom: 10px;">
                        Before: ${field.seeds[1]} T1, ${field.seeds[2]} T2, ${field.seeds[3]} T3, ${field.seeds[4]} T4
                    </div>
                    <div class="upgrade-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 0.8rem;">New T2 Total:</label>
                            <input type="number" id="upgrade_field_${index}_t2" min="0" value="${field.seeds[2] + Math.round(field.seeds[1] * 0.25) - Math.round(field.seeds[2] * 0.20)}" style="width: 100%; padding: 5px;">
                        </div>
                        <div>
                            <label style="font-size: 0.8rem;">New T3 Total:</label>
                            <input type="number" id="upgrade_field_${index}_t3" min="0" value="${field.seeds[3] + Math.round(field.seeds[2] * 0.20) - Math.round(field.seeds[3] * 0.05)}" style="width: 100%; padding: 5px;">
                        </div>
                        <div>
                            <label style="font-size: 0.8rem;">New T4 Total:</label>
                            <input type="number" id="upgrade_field_${index}_t4" min="0" value="${field.seeds[4] + Math.round(field.seeds[3] * 0.05)}" style="width: 100%; padding: 5px;">
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="optimizer.processFieldUpgradeResults('${activation.plotIndex}', '${activation.color}', ${fieldsToUpgrade.length})" 
                            style="background: #4ecdc4; color: #1a1a1a; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Continue with These Results
                    </button>
                    <button onclick="optimizer.useExpectedValues('${activation.plotIndex}', '${activation.color}')" 
                            style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; margin-left: 10px; cursor: pointer;">
                        Use Expected Values
                    </button>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    processFieldUpgradeResults(plotIndex, color, fieldCount) {
        // Use the original activation object which has the fieldIndex
        const activation = this.pendingActivationResult?.activation;
        const success = this.pendingActivationResult?.success ?? true;
        const fieldsToUpgrade = this.pendingActivationResult?.fieldsToUpgrade;
        
        if (!activation) {
            console.error('No pending activation result found');
            return;
        }
        
        if (!fieldsToUpgrade) {
            console.error('No fields to upgrade found in pending result');
            return;
        }
        
        const activatedColor = color;
        
        // Collect actual upgrade results for each field using the stored field list
        const fieldUpgrades = {};
        fieldsToUpgrade.forEach((field, index) => {
            const fieldKey = `${field.plotIndex}_${field.fieldIndex}`;
            const t2Element = document.getElementById(`upgrade_field_${index}_t2`);
            const t3Element = document.getElementById(`upgrade_field_${index}_t3`);
            const t4Element = document.getElementById(`upgrade_field_${index}_t4`);
            
            if (!t2Element || !t3Element || !t4Element) {
                console.error(`Could not find input elements for field ${index}. Expected IDs: upgrade_field_${index}_t2, upgrade_field_${index}_t3, upgrade_field_${index}_t4`);
                return;
            }
            
            const t2 = parseInt(t2Element.value) || 0;
            const t3 = parseInt(t3Element.value) || 0;
            const t4 = parseInt(t4Element.value) || 0;
            
            fieldUpgrades[fieldKey] = {
                t2: t2,
                t3: t3,
                t4: t4
            };
        });

        this.completeActivation(activation, success, fieldUpgrades);
        this.pendingActivationResult = null; // Clear the stored result
    }

    useExpectedValues(plotIndex, color) {
        // Use the original activation object which has the fieldIndex
        const activation = this.pendingActivationResult?.activation;
        const success = this.pendingActivationResult?.success ?? true;
        
        if (!activation) {
            console.error('No pending activation result found');
            return;
        }
        
        this.completeActivation(activation, success);
        this.pendingActivationResult = null; // Clear the stored result
    }

    completeActivation(activation, success, actualUpgrades = null) {
        // Record this activation in history
        this.activationHistory.push({
            activation: activation,
            success: success,
            actualUpgrades: actualUpgrades,
            seedsBefore: JSON.parse(JSON.stringify(this.currentGameState.plotFields))
        });

        // Apply the activation to current state using actual results
        this.currentGameState = this.applyFieldActivation(this.currentGameState, activation, success, actualUpgrades);

        // NOW calculate next optimal step with the real game state
        console.log('Calculating next step with actual upgrade results...');
        const nextStep = this.getNextOptimalStep();
        this.currentStep = nextStep;
        this.displayInteractiveResults();
    }

    applyFieldActivation(gameState, activation, success, actualUpgrades = null) {
        // Create a deep copy of the game state
        const newState = {
            availablePlots: gameState.availablePlots.map(p => ({ 
                ...p, 
                colors: [...p.colors],
                usedColors: [...p.usedColors]
            })),
            plotFields: gameState.plotFields.map(f => ({ 
                ...f, 
                seeds: { ...f.seeds }
            }))
        };
        
        const activatedColor = activation.color;
        const activatedPlot = newState.availablePlots.find(p => p.index === activation.plotIndex);
        
        // Find and mark the specific field that was activated as used
        const activatedField = newState.plotFields.find(f => 
            f.plotIndex === activation.plotIndex && 
            f.fieldIndex === activation.fieldIndex
        );
        
        if (!activatedField) {
            console.error('Could not find activated field!');
            console.error('Looking for: plotIndex =', activation.plotIndex, 'fieldIndex =', activation.fieldIndex);
            console.error('Available fields:', newState.plotFields.map(f => ({
                plotIndex: f.plotIndex, 
                fieldIndex: f.fieldIndex, 
                color: f.color,
                used: f.used
            })));
            console.error('Full activation object:', activation);
            throw new Error(`Could not find field at plot ${activation.plotIndex}, field ${activation.fieldIndex}`);
        }
        
        activatedField.used = true;
        
        // Also mark this color as used in the plot (for UI display)
        activatedPlot.usedColors.push(activatedColor);
        
        // Apply upgrades to fields based on success/failure
        let fieldsToUpgrade;
        if (success) {
            // Success: Upgrade all fields with different colors
            fieldsToUpgrade = newState.plotFields.filter(field => 
                field.color !== activatedColor && !field.used
            );
        } else {
            // Failure: ALSO upgrade all fields with different colors (same as success)
            // The difference is only plot availability, not which fields get upgraded
            fieldsToUpgrade = newState.plotFields.filter(field => 
                field.color !== activatedColor && !field.used
            );
        }
        
        // Apply upgrades to each field
        fieldsToUpgrade.forEach((field, index) => {
            if (actualUpgrades) {
                // Use actual upgrade results
                const fieldKey = `${field.plotIndex}_${field.fieldIndex}`;
                const upgrades = actualUpgrades[fieldKey];
                if (upgrades) {
                    // Set the new totals directly
                    field.seeds[2] = upgrades.t2;
                    field.seeds[3] = upgrades.t3;
                    field.seeds[4] = upgrades.t4;
                    
                    // Calculate T1 as remaining seeds: 23 - (T2 + T3 + T4)
                    field.seeds[1] = 23 - (upgrades.t2 + upgrades.t3 + upgrades.t4);
                    
                    // Ensure no negative values
                    for (let tier = 1; tier <= 4; tier++) {
                        field.seeds[tier] = Math.max(0, field.seeds[tier]);
                    }
                }
            } else {
                // Use expected values
                this.upgradeSeeds(field.seeds);
            }
        });
        
        if (success) {
            // 60% success: Plot stays active, can activate the other color too
            // Check if this plot is fully used (both fields activated)
            const plotFields = newState.plotFields.filter(f => f.plotIndex === activation.plotIndex);
            const allFieldsUsed = plotFields.every(field => field.used);
            
            if (allFieldsUsed) {
                activatedPlot.active = false;
            }
        } else {
            // 40% failure: Plot becomes unavailable (can't activate the other field)
            activatedPlot.active = false;
        }
        
        return newState;
    }

    displayResults(optimization) {
        // Store the initial step and display interactive interface
        this.currentStep = optimization;
        this.displayInteractiveResults();
    }

    displayInteractiveResults() {
        const step = this.currentStep;
        
        let html = `
            <div class="interactive-decision-tree">
                <h3>🎯 Interactive Decision Tree</h3>
        `;

        // Show current seed counts
        const currentT3 = step.currentState.plotFields
            .filter(field => field.color && field.seeds)
            .reduce((sum, field) => sum + field.seeds[3], 0);
        const currentT4 = step.currentState.plotFields
            .filter(field => field.color && field.seeds)
            .reduce((sum, field) => sum + field.seeds[4], 0);

        html += `
            <div class="current-status" style="background: rgba(255, 215, 0, 0.1); border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #ffd700; margin-bottom: 10px;">Current Status</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div><strong>T3 Seeds:</strong> ${currentT3}</div>
                    <div><strong>T4 Seeds:</strong> ${currentT4}</div>
                    <div><strong>Steps Taken:</strong> ${this.activationHistory.length}</div>
                </div>
            </div>
        `;

        // Show activation history
        if (this.activationHistory.length > 0) {
            html += `
                <div class="activation-history" style="margin: 20px 0;">
                    <h4 style="color: #ffd700; margin-bottom: 10px;">Previous Steps:</h4>
                    <div class="history-steps">
            `;

            this.activationHistory.forEach((historyItem, index) => {
                const plot = this.plots[historyItem.activation.plotIndex];
                const statusColor = historyItem.success ? '#4ecdc4' : '#ff4757';
                const statusText = historyItem.success ? '✅ Success' : '❌ Failed';
                
                html += `
                    <div class="history-step" style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${statusColor};">
                        <strong>Step ${index + 1}:</strong> Plot ${historyItem.activation.plotIndex + 1} - Activate ${this.colorEmojis[historyItem.activation.color]} ${historyItem.activation.color.charAt(0).toUpperCase() + historyItem.activation.color.slice(1)}
                        <span style="color: ${statusColor}; margin-left: 10px;">${statusText}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                    <button onclick="optimizer.undoLastActivation()" class="btn-secondary" style="margin-top: 10px;">↶ Undo Last Step</button>
                </div>
            `;
        }

        // Show next recommended step or completion
        if (step.isComplete) {
            html += `
                <div class="completion-message" style="background: rgba(76, 205, 196, 0.2); border-radius: 8px; padding: 20px; text-align: center;">
                    <h4 style="color: #4ecdc4;">🎉 Optimization Complete!</h4>
                    <p>No more beneficial activations available.</p>
                    <p><strong>Final T3 Seeds:</strong> ${currentT3} | <strong>Final T4 Seeds:</strong> ${currentT4}</p>
                </div>
            `;
        } else {
            const activation = step.nextActivation;
            const plot = this.plots[activation.plotIndex];
            const upgradedColors = this.colors.filter(c => c !== activation.color);

            html += `
                <div class="optimization-step" style="background: rgba(108, 92, 231, 0.1); border-radius: 12px; padding: 25px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h3 style="color: #6c5ce7; margin-bottom: 10px;">
                            🎯 ${step.isUserOverride ? 'Your Choice' : 'Recommended Move'}
                        </h3>
                        ${step.isUserOverride ? 
                            '<div style="color: #ffd700; font-size: 0.9rem; margin-bottom: 10px;">' +
                            '✨ You selected this field override ' +
                            '<button onclick="optimizer.resetToOriginalRecommendation()" ' +
                            'style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); ' +
                            'padding: 4px 8px; border-radius: 4px; margin-left: 10px; cursor: pointer; font-size: 0.8rem;">' +
                            'Reset to AI Recommendation</button></div>' : ''}
                        <div style="font-size: 1.1rem; color: #e0e0e0; margin-bottom: 10px;">
                            Activate <strong>Plot ${activation.plotIndex + 1}</strong> - 
                            ${this.colorEmojis[activation.color]} <strong>${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)} Field ${activation.fieldIndex + 1}</strong>
                        </div>
                        ${(() => {
                            // Find the specific field being recommended
                            const recommendedField = step.currentState.plotFields.find(f => 
                                f.plotIndex === activation.plotIndex && f.fieldIndex === activation.fieldIndex
                            );
                            if (recommendedField) {
                                return `
                                    <div style="font-size: 0.9rem; color: #b0b0b0; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px; margin: 10px auto; max-width: 300px;">
                                        <strong>Target Field:</strong> ${recommendedField.seeds[1]} T1, ${recommendedField.seeds[2]} T2, 
                                        <span style="color: #ffd700;">${recommendedField.seeds[3]} T3</span>, 
                                        <span style="color: #ff6b6b;">${recommendedField.seeds[4]} T4</span>
                                    </div>
                                `;
                            }
                            return '';
                        })()}
                        
                        ${(() => {
                            // Show alternative options if they have similar scores (within 10% of best)
                            const bestScore = step.expectedScore || 0;
                            const alternatives = step.availableActivations
                                .map(alt => ({
                                    activation: alt,
                                    result: this.calculateExpectedOutcome([alt], this.currentGameState, 1.0)
                                }))
                                .filter(item => 
                                    item.result.expectedScore >= bestScore * 0.9 && 
                                    item.result.expectedScore < bestScore * 1.1 &&
                                    (item.activation.plotIndex !== activation.plotIndex || item.activation.fieldIndex !== activation.fieldIndex)
                                )
                                .slice(0, 3); // Show max 3 alternatives
                                
                            if (alternatives.length > 0) {
                                let altHtml = `
                                    <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                        <h4 style="color: #ffd700; font-size: 0.9rem; margin-bottom: 10px;">Similar Options Available:</h4>
                                        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                                `;
                                
                                alternatives.forEach(alt => {
                                    const altActivation = alt.activation;
                                    altHtml += `
                                        <button onclick="optimizer.selectAlternativeActivation(${altActivation.plotIndex}, '${altActivation.color}', ${altActivation.fieldIndex})" 
                                                style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); 
                                                       padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                            Plot ${altActivation.plotIndex + 1} ${this.colorEmojis[altActivation.color]} ${altActivation.color}
                                            <br><span style="font-size: 0.7rem; color: #888;">Score: ${alt.result.expectedScore.toFixed(1)}</span>
                                        </button>
                                    `;
                                });
                                
                                altHtml += `
                                        </div>
                                        <div style="font-size: 0.8rem; color: #888; margin-top: 8px; text-align: center;">
                                            Click any option to use it instead of the recommendation
                                        </div>
                                    </div>
                                `;
                                return altHtml;
                            }
                            return '';
                        })()}
                    </div>

                    <div class="action-buttons" style="text-align: center; margin-bottom: 25px;">
                        <button onclick="optimizer.processUserInput(true)" 
                                style="background: #4ecdc4; color: #1a1a1a; border: none; padding: 15px 30px; border-radius: 8px; font-size: 1rem; font-weight: 600; margin: 0 10px; cursor: pointer;">
                            ✅ Success (60%)
                        </button>
                        <button onclick="optimizer.processUserInput(false)" 
                                style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 1rem; font-weight: 600; margin: 0 10px; cursor: pointer;">
                            ❌ Failure (40%)
                        </button>
                    </div>
                    
                    <p style="text-align: center; margin-top: 15px; font-size: 0.9rem; color: #888;">
                        Try the activation in-game, then click the result above
                    </p>
                    
                    <div style="text-align: center; margin-bottom: 15px;">
                        <button onclick="optimizer.showAlternativeAnalysis()" 
                                style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                            📊 Show All Option Scores
                        </button>
                    </div>
                </div>
            `;

            // Show current field states
            const totalT3 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[3], 0);
            const totalT4 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[4], 0);

            html += `
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #ffd700; margin-bottom: 15px;">Current State</h4>
                        <div style="text-align: center; margin-bottom: 15px; font-size: 1.1rem;">
                            <span style="color: #ffd700;">Total T3: ${totalT3}</span> | 
                            <span style="color: #ff6b6b;">Total T4: ${totalT4}</span>
                        </div>
                        
                        <div class="field-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            `;
            
            step.currentState.plotFields.forEach(field => {
                const plot = step.currentState.availablePlots.find(p => p.index === field.plotIndex);
                const isColorUsed = plot?.usedColors.includes(field.color);
                const isPlotInactive = !plot?.active;
                const isUnavailable = isColorUsed || isPlotInactive || field.used;
                
                // Check if this field is available for activation
                const isClickable = !isUnavailable;
                const clickHandler = isClickable ? `onclick="optimizer.selectFieldOverride(${field.plotIndex}, '${field.color}', ${field.fieldIndex})"` : '';
                const clickableStyle = isClickable ? 'cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.2s;' : '';
                const hoverStyle = isClickable ? 'onmouseover="this.style.backgroundColor=\'rgba(255, 255, 255, 0.1)\'" onmouseout="this.style.backgroundColor=\'rgba(255, 255, 255, ' + (isUnavailable ? '0.02' : '0.08') + ')\'"' : '';
                
                html += `
                    <div style="background: rgba(255, 255, 255, ${isUnavailable ? '0.02' : '0.08'}); border-radius: 6px; padding: 10px; ${isUnavailable ? 'opacity: 0.5;' : ''} ${clickableStyle}" 
                         ${clickHandler} ${hoverStyle}>
                        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 5px;">
                            Plot ${field.plotIndex + 1} - ${this.colorEmojis[field.color]} ${this.colorNames[field.color]}
                            ${isColorUsed ? ' (Used)' : ''}
                            ${isPlotInactive && !isColorUsed ? ' (Plot Failed)' : ''}
                            ${field.used ? ' (Field Used)' : ''}
                            ${isClickable ? ' 👆' : ''}
                        </div>
                        <div style="font-size: 0.8rem;">
                            T1: ${field.seeds[1]} | T2: ${field.seeds[2]} | 
                            T3: ${field.seeds[3]} | T4: ${field.seeds[4]}
                        </div>
                        ${isClickable ? `<div style="font-size: 0.7rem; color: #888; margin-top: 3px;">Click to override recommendation</div>` : ''}
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
            `;
        }

        // Show computation details if available
        if (step.computationInfo) {
            html += `
                <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 15px; margin-top: 15px; font-size: 0.9rem; color: #888;">
                    <strong>Computation Details:</strong> 
                    Evaluated ${step.computationInfo.sequencesEvaluated} sequences | 
                    Lookahead: ${step.computationInfo.lookaheadDepth} steps | 
                    Deep Search: ${step.computationInfo.deepSearch ? 'On' : 'Off'}
                    ${step.expectedScore ? ` | <span style="color: #ffd700;">Expected Score: ${step.expectedScore.toFixed(1)}</span>` : ''}
                    <br><br>
                    <strong>Alternative Options Analysis:</strong>
                    <div id="alternativeAnalysis" style="margin-top: 10px; font-size: 0.8rem;">
                        <button onclick="optimizer.showAlternativeAnalysis()" style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            Show All Option Scores
                        </button>
                    </div>
                </div>
            `;
        }

        html += `</div>`;

        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="optimizer.restartOptimization()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    🔄 Start Over
                </button>
            </div>
        `;

        html += `</div>`;
        
        this.resultsContent.innerHTML = html;
    }

    restartOptimization() {
        // Clear any pending state
        this.pendingActivationResult = null;
        this.activationHistory = [];
        
        this.currentGameState = this.getInitialGameState();
        this.currentStep = this.getNextOptimalStep();
        this.displayInteractiveResults();
    }

    getInitialGameState() {
        // Each plot has 2 fields, each field has 23 T1 seeds
        const plotFields = [];
        
        this.plots.forEach((plot, plotIndex) => {
            if (!plot.color1 || !plot.color2) {
                throw new Error(`Plot ${plotIndex + 1} has invalid color configuration`);
            }
            
            // Add field for color 1
            plotFields.push({
                plotIndex: plotIndex,
                fieldIndex: 0,
                color: plot.color1,
                seeds: { 1: 23, 2: 0, 3: 0, 4: 0 },
                used: false
            });
            
            // Add field for color 2
            plotFields.push({
                plotIndex: plotIndex,
                fieldIndex: 1,
                color: plot.color2,
                seeds: { 1: 23, 2: 0, 3: 0, 4: 0 },
                used: false
            });
        });
        
        return {
            availablePlots: this.plots.map((plot, index) => ({ 
                index, 
                colors: [plot.color1, plot.color2],
                active: true,
                usedColors: [] // Track which colors in this plot have been activated
            })),
            plotFields: plotFields
        };
    }

    calculateExpectedOutcome(remainingSequence, gameState, probability, debugLevel = 0) {
        // Base case: no more activations
        if (remainingSequence.length === 0) {
            const totalT3 = gameState.plotFields.reduce((sum, field) => sum + field.seeds[3], 0);
            const totalT4 = gameState.plotFields.reduce((sum, field) => sum + field.seeds[4], 0);
            const score = totalT3 * 10 + totalT4 * -5;
            
            return {
                expectedScore: score * probability,
                expectedT3: totalT3 * probability,
                expectedT4: totalT4 * probability,
                probability: probability,
                outcomes: [{
                    plotFields: gameState.plotFields,
                    probability: probability,
                    totalT3: totalT3,
                    totalT4: totalT4
                }]
            };
        }

        const activation = remainingSequence[0];
        const remainingAfter = remainingSequence.slice(1);
        
        // Check if this activation is still possible
        const plot = gameState.availablePlots.find(p => p.index === activation.plotIndex);
        if (!plot || !plot.active || plot.usedColors.includes(activation.color)) {
            // Activation not possible, skip it
            return this.calculateExpectedOutcome(remainingAfter, gameState, probability, debugLevel);
        }

        // DEBUG: Only log details for top-level calls (debugLevel 0) and single sequences
        const shouldDebug = debugLevel === 0 && remainingSequence.length === 1;
        
        if (shouldDebug) {
            console.log(`🔍 DEBUGGING: Plot ${activation.plotIndex + 1} ${activation.color}`);
            
            // Find the target field being activated
            const targetField = gameState.plotFields.find(f => 
                f.plotIndex === activation.plotIndex && f.fieldIndex === activation.fieldIndex
            );
            if (targetField) {
                console.log(`  Target field: T1:${targetField.seeds[1]}, T2:${targetField.seeds[2]}, T3:${targetField.seeds[3]}, T4:${targetField.seeds[4]}`);
            }
        }

        // Calculate outcomes for both success (60%) and failure (40%) scenarios
        const successState = this.applyFieldActivation(gameState, activation, true);
        const failureState = this.applyFieldActivation(gameState, activation, false);
        
        // OPPORTUNITY COST FIX: Calculate lost value when plot becomes inactive on failure
        let failureOpportunityCost = 0;
        if (!successState.availablePlots.find(p => p.index === activation.plotIndex)?.active) {
            // Plot becomes inactive on success too (both fields used) - no additional cost
        } else if (!failureState.availablePlots.find(p => p.index === activation.plotIndex)?.active) {
            // Plot becomes inactive only on failure - calculate opportunity cost of lost fields
            const lostFields = failureState.plotFields.filter(field => 
                field.plotIndex === activation.plotIndex && 
                !field.used &&
                field.fieldIndex !== activation.fieldIndex
            );
            
            // Calculate the expected value of each lost field if it could be activated
            for (const lostField of lostFields) {
                // Estimate the value of this field based on potential future activations
                // This is a simplified estimate - in reality we'd need to simulate all possible futures
                const t2Value = lostField.seeds[2] * 0.20 * 10; // T2 seeds that could become T3
                const t3Value = lostField.seeds[3] * 10; // Existing T3 seeds
                const fieldOpportunityValue = t2Value + t3Value;
                failureOpportunityCost += fieldOpportunityValue;
                
                if (shouldDebug) {
                    console.log(`    Lost field opportunity cost: Plot ${lostField.plotIndex + 1} ${lostField.color}`);
                    console.log(`      T2 potential: ${lostField.seeds[2]} * 0.20 * 10 = ${t2Value.toFixed(1)}`);
                    console.log(`      T3 existing: ${lostField.seeds[3]} * 10 = ${t3Value.toFixed(1)}`);
                    console.log(`      Total field value: ${fieldOpportunityValue.toFixed(1)}`);
                }
            }
            
            if (shouldDebug && failureOpportunityCost > 0) {
                console.log(`    Total failure opportunity cost: ${failureOpportunityCost.toFixed(1)}`);
            }
        }
        
        const successOutcome = this.calculateExpectedOutcome(remainingAfter, successState, probability * 0.6, debugLevel + 1);
        const failureOutcome = this.calculateExpectedOutcome(remainingAfter, failureState, probability * 0.4, debugLevel + 1);
        
        // Subtract opportunity cost from failure outcome
        const adjustedFailureScore = failureOutcome.expectedScore - (failureOpportunityCost * probability * 0.4);
        
        // Combine outcomes
        return {
            expectedScore: successOutcome.expectedScore + adjustedFailureScore,
            expectedT3: successOutcome.expectedT3 + failureOutcome.expectedT3,
            expectedT4: successOutcome.expectedT4 + failureOutcome.expectedT4,
            probability: probability,
            outcomes: [...successOutcome.outcomes, ...failureOutcome.outcomes]
        };
    }

    upgradeSeeds(colorSeeds) {
        // Upgrade from T3 to T4 first (to avoid upgrading newly created T3s)
        const t3ToT4 = this.applyUpgradeChance(colorSeeds[3], this.upgradeProbabilities[3]);
        colorSeeds[3] -= t3ToT4;
        colorSeeds[4] += t3ToT4;

        // Upgrade from T2 to T3
        const t2ToT3 = this.applyUpgradeChance(colorSeeds[2], this.upgradeProbabilities[2]);
        colorSeeds[2] -= t2ToT3;
        colorSeeds[3] += t2ToT3;

        // Upgrade from T1 to T2
        const t1ToT2 = this.applyUpgradeChance(colorSeeds[1], this.upgradeProbabilities[1]);
        colorSeeds[1] -= t1ToT2;
        colorSeeds[2] += t1ToT2;
    }

    applyUpgradeChance(seedCount, probability) {
        // Use deterministic expected values for consistent optimization results
        if (seedCount === 0) return 0;
        
        // Always use expected value calculation for deterministic results
        return Math.round(seedCount * probability);
    }

    displayError(message) {
        this.resultsContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff4757;">
                <h3>Optimization Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.optimizeBtn.disabled = show;
        if (show) {
            this.resultsContent.innerHTML = '';
        }
    }

    handlePresetChange() {
        const preset = this.performancePreset.value;
        
        if (preset === 'custom') {
            this.customSettingsDiv.style.display = 'block';
            return;
        }

        // Apply preset values
        const presets = {
            fast: {
                lookaheadDepth: 2,
                maxBranchingFactor: 20,
                enableDeepSearch: false,
                probabilityThreshold: 0.05
            },
            balanced: {
                lookaheadDepth: 3,
                maxBranchingFactor: 200,
                enableDeepSearch: true,
                probabilityThreshold: 0.02
            },
            thorough: {
                lookaheadDepth: 5,
                maxBranchingFactor: 2000,
                enableDeepSearch: true,
                probabilityThreshold: 0.01
            }
        };

        if (presets[preset]) {
            this.computationSettings = { ...this.computationSettings, ...presets[preset] };
            this.syncUIWithSettings();
        }

        this.customSettingsDiv.style.display = preset === 'custom' ? 'block' : 'none';
    }

    updateComputationSettings() {
        this.computationSettings.lookaheadDepth = parseInt(this.lookaheadDepthInput.value);
        this.computationSettings.maxBranchingFactor = parseInt(this.maxBranchingFactorInput.value);
        this.computationSettings.enableDeepSearch = this.enableDeepSearchInput.checked;
        this.computationSettings.probabilityThreshold = parseFloat(this.probabilityThresholdInput.value);
        
        // Switch to custom when user manually changes values
        this.performancePreset.value = 'custom';
        this.customSettingsDiv.style.display = 'block';
    }

    syncUIWithSettings() {
        this.lookaheadDepthInput.value = this.computationSettings.lookaheadDepth;
        this.maxBranchingFactorInput.value = this.computationSettings.maxBranchingFactor;
        this.enableDeepSearchInput.checked = this.computationSettings.enableDeepSearch;
        this.probabilityThresholdInput.value = this.computationSettings.probabilityThreshold;
    }

    undoLastActivation() {
        if (this.activationHistory.length === 0) {
            alert('No activations to undo!');
            return;
        }

        // Remove last activation from history
        this.activationHistory.pop();

        // Reset to initial state and replay history
        this.currentGameState = this.getInitialGameState();

        // Replay all remaining history
        for (const historyItem of this.activationHistory) {
            this.currentGameState = this.applyFieldActivation(
                this.currentGameState, 
                historyItem.activation, 
                historyItem.success,
                historyItem.actualUpgrades
            );
        }

        // Calculate next optimal step with current state
        const nextStep = this.getNextOptimalStep();
        this.currentStep = nextStep;
        this.displayInteractiveResults();
    }

    showAlternativeAnalysis() {
        // Use current step info instead of recalculating
        const step = this.currentStep;
        if (!step || step.isComplete) {
            console.error('No current step available for alternative analysis');
            return;
        }

        console.log('Showing alternative analysis using CACHED scores from main recommendation (no recalculation)');

        // Use cached scores from the main recommendation calculation
        if (!step.activationScores || step.activationScores.size === 0) {
            console.error('No cached scores available - falling back to recalculation');
            this.showAlternativeAnalysisWithRecalculation();
            return;
        }

        // Convert cached scores to array and sort by best score
        const sortedScores = Array.from(step.activationScores.values())
            .sort((a, b) => b.bestScore - a.bestScore);

        // Add T3/T4 info for display (only calculate single-step for UI, not scoring)
        for (const scoreData of sortedScores) {
            const singleStepResult = this.calculateExpectedOutcome([scoreData.activation], this.currentGameState, 1.0);
            scoreData.expectedT3 = singleStepResult.expectedT3;
            scoreData.expectedT4 = singleStepResult.expectedT4;
            
            // DEBUG: Log cached score details
            console.log(`CACHED Score for ${scoreData.plotInfo}:`);
            console.log(`  Best Score: ${scoreData.bestScore.toFixed(2)} (from ${scoreData.sequencesEvaluated} sequences)`);
            console.log(`  Single-step T3: ${scoreData.expectedT3.toFixed(2)}, T4: ${scoreData.expectedT4.toFixed(2)}`);
        }

        let html = `
            <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #ffd700; margin-bottom: 15px;">🎯 All Available Activations Ranked</h4>
                <div style="font-size: 0.9rem; color: #b0b0b0; margin-bottom: 15px;">
                    ${this.computationSettings.enableDeepSearch ? 
                        `Using CACHED deep search results (${this.computationSettings.lookaheadDepth} steps lookahead) - no recalculation needed:` : 
                        'Using CACHED single-step results - no recalculation needed:'}
                </div>
        `;

        sortedScores.forEach((item, index) => {
            const isRecommended = index === 0;
            html += `
                <div style="background: rgba(255, 255, 255, ${isRecommended ? '0.08' : '0.03'}); border-radius: 6px; padding: 12px; margin-bottom: 8px; ${isRecommended ? 'border-left: 3px solid #ffd700;' : ''}">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 15px; align-items: center;">
                        <div>
                            <strong style="color: ${isRecommended ? '#ffd700' : '#e0e0e0'};">
                                ${isRecommended ? '👑 ' : ''}${item.plotInfo}
                            </strong>
                            ${this.computationSettings.enableDeepSearch ? 
                                `<br><span style="font-size: 0.7rem; color: #888;">${item.sequencesEvaluated} sequences (cached)</span>` : 
                                ''}
                        </div>
                        <div style="text-align: center;">
                            Score: <span style="color: #4ecdc4;">${item.bestScore.toFixed(1)}</span>
                        </div>
                        <div style="text-align: center;">
                            T3: <span style="color: #ffd700;">${item.expectedT3.toFixed(1)}</span>
                        </div>
                        <div style="text-align: center;">
                            T4: <span style="color: #ff6b6b;">${item.expectedT4.toFixed(1)}</span>
                        </div>
                    </div>
                    ${isRecommended ? '<div style="font-size: 0.8rem; color: #888; margin-top: 5px;">⚡ This matches the main recommendation (cached result)</div>' : ''}
                </div>
            `;
        });

        html += `
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="optimizer.displayInteractiveResults()" 
                            style="background: #6c5ce7; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        ← Back to Recommendation
                    </button>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    // Fallback method for recalculation if cached scores aren't available
    showAlternativeAnalysisWithRecalculation() {
        // Use current step info instead of recalculating
        const step = this.currentStep;
        if (!step || step.isComplete) {
            console.error('No current step available for alternative analysis');
            return;
        }

        console.log('FALLBACK: Recalculating scores (cached scores not available)');

        // Use the EXACT same logic as getNextOptimalStep
        const activationScores = new Map();
        
        // Initialize scores for all available activations
        for (const activation of step.availableActivations) {
            const key = `${activation.plotIndex}_${activation.color}_${activation.fieldIndex}`;
            activationScores.set(key, {
                activation: activation,
                bestScore: -1,
                sequencesEvaluated: 0,
                plotInfo: `Plot ${activation.plotIndex + 1} - ${this.colorEmojis[activation.color]} ${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)}`
            });
        }

        if (this.computationSettings.enableDeepSearch) {
            // Generate sequences using EXACT same method as main recommendation
            const sequences = this.generateLookaheadSequences(
                step.availableActivations, 
                this.computationSettings.lookaheadDepth
            );
            
            console.log(`Generated ${sequences.length} total sequences (same as main recommendation)`);
            
            for (const sequence of sequences) {
                const result = this.calculateExpectedOutcome(sequence, this.currentGameState, 1.0);
                
                // Credit this score to the first step of the sequence
                const firstStep = sequence[0];
                const key = `${firstStep.plotIndex}_${firstStep.color}_${firstStep.fieldIndex}`;
                const scoreData = activationScores.get(key);
                
                if (scoreData && result.expectedScore > scoreData.bestScore) {
                    scoreData.bestScore = result.expectedScore;
                }
                scoreData.sequencesEvaluated++;
            }
        } else {
            // Single-step evaluation
            for (const activation of step.availableActivations) {
                const result = this.calculateExpectedOutcome([activation], this.currentGameState, 1.0);
                const key = `${activation.plotIndex}_${activation.color}_${activation.fieldIndex}`;
                const scoreData = activationScores.get(key);
                scoreData.bestScore = result.expectedScore;
                scoreData.sequencesEvaluated = 1;
            }
        }

        // Convert to array and sort by best score
        const sortedScores = Array.from(activationScores.values())
            .sort((a, b) => b.bestScore - a.bestScore);

        // Add T3/T4 info for display
        for (const scoreData of sortedScores) {
            const singleStepResult = this.calculateExpectedOutcome([scoreData.activation], this.currentGameState, 1.0);
            scoreData.expectedT3 = singleStepResult.expectedT3;
            scoreData.expectedT4 = singleStepResult.expectedT4;
            
            // DEBUG: Log detailed score calculation
            console.log(`Score for ${scoreData.plotInfo}:`);
            console.log(`  Best Score: ${scoreData.bestScore.toFixed(2)} (from ${scoreData.sequencesEvaluated} sequences)`);
            console.log(`  Single-step T3: ${scoreData.expectedT3.toFixed(2)}, T4: ${scoreData.expectedT4.toFixed(2)}`);
        }

        let html = `
            <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #ffd700; margin-bottom: 15px;">🎯 All Available Activations Ranked</h4>
                <div style="font-size: 0.9rem; color: #b0b0b0; margin-bottom: 15px;">
                    ${this.computationSettings.enableDeepSearch ? 
                        `Showing deep search results (${this.computationSettings.lookaheadDepth} steps lookahead) - RECALCULATED:` : 
                        'Showing single-step analysis - RECALCULATED:'}
                </div>
        `;

        sortedScores.forEach((item, index) => {
            const isRecommended = index === 0;
            html += `
                <div style="background: rgba(255, 255, 255, ${isRecommended ? '0.08' : '0.03'}); border-radius: 6px; padding: 12px; margin-bottom: 8px; ${isRecommended ? 'border-left: 3px solid #ffd700;' : ''}">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 15px; align-items: center;">
                        <div>
                            <strong style="color: ${isRecommended ? '#ffd700' : '#e0e0e0'};">
                                ${isRecommended ? '👑 ' : ''}${item.plotInfo}
                            </strong>
                            ${this.computationSettings.enableDeepSearch ? 
                                `<br><span style="font-size: 0.7rem; color: #888;">${item.sequencesEvaluated} sequences evaluated</span>` : 
                                ''}
                        </div>
                        <div style="text-align: center;">
                            Score: <span style="color: #4ecdc4;">${item.bestScore.toFixed(1)}</span>
                        </div>
                        <div style="text-align: center;">
                            T3: <span style="color: #ffd700;">${item.expectedT3.toFixed(1)}</span>
                        </div>
                        <div style="text-align: center;">
                            T4: <span style="color: #ff6b6b;">${item.expectedT4.toFixed(1)}</span>
                        </div>
                    </div>
                    ${isRecommended ? '<div style="font-size: 0.8rem; color: #888; margin-top: 5px;">⚡ This should match the main recommendation</div>' : ''}
                </div>
            `;
        });

        html += `
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="optimizer.displayInteractiveResults()" 
                            style="background: #6c5ce7; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        ← Back to Recommendation
                    </button>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    selectAlternativeActivation(plotIndex, color, fieldIndex) {
        // Override the current step's recommendation with the user's choice
        const userChoice = {
            plotIndex: plotIndex,
            color: color,
            fieldIndex: fieldIndex
        };
        
        // Verify this is a valid activation
        const isValid = this.currentStep.availableActivations.some(activation => 
            activation.plotIndex === plotIndex && 
            activation.color === color && 
            activation.fieldIndex === fieldIndex
        );
        
        if (!isValid) {
            console.error('Invalid activation choice:', userChoice);
            return;
        }
        
        // Update the current step with the user's choice
        this.currentStep.nextActivation = userChoice;
        this.currentStep.isUserOverride = true;
        
        // Recalculate expected score for the chosen option
        const result = this.calculateExpectedOutcome([userChoice], this.currentGameState, 1.0);
        this.currentStep.expectedScore = result.expectedScore;
        
        console.log(`User selected alternative: Plot ${plotIndex + 1} ${color} (Score: ${result.expectedScore.toFixed(1)})`);
        
        // Redisplay the step with the new choice highlighted
        this.displayInteractiveResults();
    }

    selectFieldOverride(plotIndex, color, fieldIndex) {
        // Override the current step's recommendation with the user's choice
        const userChoice = {
            plotIndex: plotIndex,
            color: color,
            fieldIndex: fieldIndex
        };
        
        // Verify this is a valid activation
        const isValid = this.currentStep.availableActivations.some(activation => 
            activation.plotIndex === plotIndex && 
            activation.color === color && 
            activation.fieldIndex === fieldIndex
        );
        
        if (!isValid) {
            console.error('Invalid activation choice:', userChoice);
            return;
        }
        
        // Update the current step with the user's choice
        this.currentStep.nextActivation = userChoice;
        this.currentStep.isUserOverride = true;
        
        // Recalculate expected score for the chosen option
        const result = this.calculateExpectedOutcome([userChoice], this.currentGameState, 1.0);
        this.currentStep.expectedScore = result.expectedScore;
        
        console.log(`User selected field override: Plot ${plotIndex + 1} ${color} (Score: ${result.expectedScore.toFixed(1)})`);
        
        // Redisplay the step with the new choice highlighted
        this.displayInteractiveResults();
    }

    resetToOriginalRecommendation() {
        // Reset the current step to the original recommended step
        this.currentStep = this.getNextOptimalStep();
        this.displayInteractiveResults();
    }
}

// Initialize the optimizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.optimizer = new CropRotationOptimizer();
}); 