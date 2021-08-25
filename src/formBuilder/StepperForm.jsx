import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import BoostDetails from '../components/boostDetails';
import Signer from '../components/signer';
import TheSummoner from '../components/theSummoner';
import { useFormModal, useOverlay } from '../contexts/OverlayContext';
import FormBuilder from './formBuilder';

const StepperForm = props => {
  const { steps = {}, minionData, boostContent, playlist } = props;
  const parentForm = useForm({ shouldUnregister: false });
  const { closeModal } = useFormModal();
  const { errorToast } = useOverlay();

  const [currentStep, setCurrentStep] = useState(
    Object.values(steps).find(step => step.start),
  );

  const goToNext = () => {
    if (currentStep.finish) {
      closeModal();
    } else if (currentStep.next) {
      const nextStep = steps[currentStep.next];
      if (nextStep) {
        setCurrentStep(nextStep);
      } else {
        errorToast({
          title: 'Next step does not match any other steps',
          description:
            'Check the steps and make sure the "next" key links to a valid step',
        });
      }
    } else {
      errorToast({
        title: 'Next step is undefined or falsy',
      });
    }
  };

  if (currentStep?.type === 'form') {
    return (
      <FormBuilder
        {...currentStep.lego}
        parentForm={parentForm}
        goToNext={goToNext}
        next={currentStep.next}
        ctaText={currentStep.ctaText || 'Next'}
      />
    );
  }
  if (currentStep?.type === 'boostDetails') {
    return (
      <BoostDetails
        content={boostContent}
        goToNext={goToNext}
        next={currentStep.next}
        steps={steps}
      />
    );
  }
  if (currentStep?.type === 'summoner') {
    return (
      <TheSummoner
        {...currentStep}
        localForm={parentForm}
        next={currentStep.next}
        minionData={minionData}
        goToNext={goToNext}
        boostContent={boostContent}
      />
    );
  }
  if (currentStep?.type === 'signer') {
    return (
      <Signer
        {...currentStep}
        boostData={props}
        next={currentStep.next}
        goToNext={goToNext}
        playlist={playlist}
      />
    );
  }
  return null;
};

export default StepperForm;
